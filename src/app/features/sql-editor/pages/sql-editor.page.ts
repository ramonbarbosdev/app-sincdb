import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { finalize } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';
import { format } from 'sql-formatter';
import { AuthService } from '../../../auth/auth.service';
import { SqlConfirmationDialogComponent } from '../components/sql-confirmation-dialog/sql-confirmation-dialog.component';
import { SqlEditorHeaderComponent } from '../components/sql-editor-header/sql-editor-header.component';
import { SqlEditorToolbarComponent } from '../components/sql-editor-toolbar/sql-editor-toolbar.component';

import { SqlWorkspaceComponent } from '../components/sql-workspace/sql-workspace.component';
import { SqlCloudBlockAlertComponent } from '../components/sql-cloud-block-alert/sql-cloud-block-alert.component';
import { SqlStatusbarComponent } from '../components/sql-statusbar/sql-statusbar.component';

import {
  DangerousSqlCheck,
  PendingSqlExecution,
  SavedSqlQuery,
  SelectOption,
  SqlCatalogResponse,
  SqlCatalogTableSelection,
  SqlEditorState,
  SqlEnvironment,
  SqlExecutionResponse,
  SqlHistoryItem,
  SqlMessage,
} from '../models/sql-editor.model';
import { SqlEditorService } from '../services/sql-editor.service';

const INITIAL_SQL = `-- Exemplo de consulta
SELECT
  id_usuario,
  nome,
  email,
  criado_em
FROM public.usuario
WHERE ativo = true
ORDER BY criado_em DESC
LIMIT 100;`;

type SqlWorkspaceMode = 'adaptive' | 'editor' | 'results';

interface SqlInsight {
  label: string;
  value: string;
}

interface SqlColumnStatistic {
  name: string;
  type: 'numeric' | 'text' | 'date' | 'mixed';
  distinct: number;
  nullPercent: number;
  min?: string;
  max?: string;
  average?: string;
}

@Component({
  selector: 'app-sql-editor-page',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    DialogModule,
    TabsModule,
    SqlEditorHeaderComponent,
    SqlEditorToolbarComponent,
    SqlWorkspaceComponent,
    SqlCloudBlockAlertComponent,
    SqlStatusbarComponent,
  ],
  templateUrl: `./sql-editor.page.html`,
  styleUrl: './sql-editor.page.scss'
})
export class SqlEditorPage implements OnInit {
  @ViewChild('workspaceEl') workspaceEl?: ElementRef<HTMLElement>;

  ambiente: SqlEnvironment = 'local';
  conexaoId = '';
  base = 'db_name';
  maxRows = 500;
  timeoutSeconds = 30;
  connected = true;
  sql = INITIAL_SQL;
  state: SqlEditorState = 'initial';
  result?: SqlExecutionResponse;
  errorMessage = '';
  cloudBlockedMessage = '';
  sidePanelOpen = true;
  loadingConexoes = false;
  loadingBases = false;
  history: SqlHistoryItem[] = [];
  savedQueries: SavedSqlQuery[] = [];
  messages: SqlMessage[] = [];
  catalogoSql?: SqlCatalogResponse;
  tabelaSelecionada?: SqlCatalogTableSelection;
  propriedadesTabelaVisible = false;
  workspaceMode: SqlWorkspaceMode = 'adaptive';
  editorPanePercent = 62;
  draggingDivider = false;
  pendingExecution?: PendingSqlExecution;
  confirmationVisible = false;

  ambientes: SelectOption[] = [
    { label: 'Cloud', value: 'cloud' },
    { label: 'Local', value: 'local' },
  ];

  conexoes: SelectOption[] = [];
  bases: SelectOption[] = [];

  dangerCheck: DangerousSqlCheck = { dangerous: false, reason: '' };

  private readonly service = inject(SqlEditorService);
  private readonly messageService = inject(MessageService);
  private readonly auth = inject(AuthService);
  private readonly cd = inject(ChangeDetectorRef);

  get workspaceGridTemplate(): string {
    if (this.workspaceMode === 'editor') return 'minmax(0, 1fr) 0 0';
    if (this.workspaceMode === 'results') return '0 0 minmax(0, 1fr)';

    return `minmax(0, ${this.editorPanePercent}fr) 8px minmax(0, ${100 - this.editorPanePercent}fr)`;
  }

  get conexaoLabel(): string {
    return this.conexoes.find((item) => item.value === this.conexaoId)?.label || 'Conexao';
  }

  get statusLabel(): string {
    if (this.state === 'executing') return 'Executando';
    if (this.state === 'loaded') return 'Resultado carregado';
    if (this.state === 'success') return 'Sucesso';
    if (this.state === 'error') return 'Erro';
    if (this.state === 'empty') return 'Sem resultado';
    return 'Inicial';
  }

  get isAdmin(): boolean {
    const user = this.auth.getUserSubbject();
    if (!user || user.precisaSelecionarOrganizacao) return false;

    const organizacaoAtiva = Array.isArray(user.organizacoes)
      ? user.organizacoes.find((item: any) => item.idOrganizacao === user.idOrganizacao)
      : undefined;
    const role = user.dsRole ?? user.role ?? organizacaoAtiva?.dsRole ?? organizacaoAtiva?.role;

    return role === 'ROLE_ADMIN' || role === 'ROLE_DEV';
  }

  get resultInsights(): SqlInsight[] {
    const rows = this.result?.rows || [];
    const columns = this.result?.columns || [];

    return [
      { label: 'Linhas', value: String(rows.length) },
      { label: 'Colunas', value: String(columns.length) },
      { label: 'Tempo', value: this.result ? this.formatDuration(this.result.executionTimeMs) : '-' },
      { label: 'Tamanho', value: this.estimateResultSize(rows) },
      { label: 'Engine', value: this.base ? 'PostgreSQL' : '-' },
    ];
  }

  get queryWarnings(): string[] {
    const executableSql = this.removerComentarios(this.sql).trim();
    const normalized = executableSql.replace(/\s+/g, ' ').toUpperCase();
    const warnings: string[] = [];

    if (/\bSELECT\s+\*/.test(normalized)) warnings.push('SELECT * detectado');
    if (/\bSELECT\b/.test(normalized) && !/\bLIMIT\b/.test(normalized)) warnings.push('Consulta sem LIMIT');
    if (/\bUPDATE\b/.test(normalized) && !/\bWHERE\b/.test(normalized)) warnings.push('UPDATE sem WHERE');
    if (/\bDELETE\s+FROM\b/.test(normalized) && !/\bWHERE\b/.test(normalized)) warnings.push('DELETE sem WHERE');
    if (/\bJOIN\b/.test(normalized) && !/\bON\b/.test(normalized)) warnings.push('JOIN sem condição ON');
    if ((this.result?.rows.length || 0) >= this.maxRows) warnings.push('Resultado atingiu o limite de linhas');

    return warnings.slice(0, 5);
  }

  get columnStatistics(): SqlColumnStatistic[] {
    const rows = this.result?.rows || [];
    const columns = this.result?.columns || [];
    if (!rows.length || !columns.length) return [];

    return columns.slice(0, 24).map((column) => this.buildColumnStatistic(column.name, rows));
  }

  ngOnInit(): void {
    this.carregarConexoes();
    this.recarregarPaineis();
    this.dangerCheck = this.checkDangerousSql(this.sql);
  }

  onAmbienteChange(ambiente: SqlEnvironment): void {
    this.ambiente = ambiente;
    if (ambiente === 'local') this.cloudBlockedMessage = '';
    this.carregarBases();
  }

  onConexaoChange(conexaoId: string): void {
    this.conexaoId = conexaoId;
    this.carregarBases();
  }

  onBaseChange(base: string): void {
    this.base = base;
    this.carregarCatalogo();
  }

  onSqlChange(sql: string): void {
    this.sql = sql;
    this.dangerCheck = this.checkDangerousSql(sql);
    this.applyAdaptiveLayout([70, 30]);
  }

  abrirPropriedadesTabela(tabela: SqlCatalogTableSelection): void {
    this.tabelaSelecionada = tabela;
    this.propriedadesTabelaVisible = true;
  }

  maximizarEditor(): void {
    this.workspaceMode = 'editor';
    this.scheduleLayoutRefresh();
  }

  maximizarResultados(): void {
    this.workspaceMode = 'results';
    this.scheduleLayoutRefresh();
  }

  restaurarLayout(): void {
    this.workspaceMode = 'adaptive';
    this.editorPanePercent = this.result ? 42 : 62;
    this.scheduleLayoutRefresh();
  }

  iniciarResizeWorkspace(event: PointerEvent): void {
    event.preventDefault();
    this.draggingDivider = true;
    this.workspaceMode = 'adaptive';
    document.body.classList.add('sql-resizing');
  }

  @HostListener('document:pointermove', ['$event'])
  onWorkspaceResizeMove(event: PointerEvent): void {
    if (!this.draggingDivider || !this.workspaceEl?.nativeElement) return;

    const rect = this.workspaceEl.nativeElement.getBoundingClientRect();
    const percent = ((event.clientY - rect.top) / rect.height) * 100;
    this.editorPanePercent = Math.min(82, Math.max(24, percent));
    this.scheduleLayoutRefresh();
  }

  @HostListener('document:pointerup')
  onWorkspaceResizeEnd(): void {
    if (!this.draggingDivider) return;

    this.draggingDivider = false;
    document.body.classList.remove('sql-resizing');
    this.scheduleLayoutRefresh();
  }

  novaConsulta(): void {
    this.sql = INITIAL_SQL;
    this.result = undefined;
    this.errorMessage = '';
    this.cloudBlockedMessage = '';
    this.state = 'initial';
    this.dangerCheck = this.checkDangerousSql(this.sql);
  }

  salvarConsulta(): void {
    const name = this.sql.split('\n').find((line) => line.trim() && !line.trim().startsWith('--'))?.trim() || 'Consulta SQL';
    this.service.salvarConsulta({ name, sql: this.sql }).subscribe({
      next: () => this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Consulta preparada para salvar.' }),
      error: () => this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Nao foi possivel salvar a consulta.' }),
    });
  }

  toggleHistory(): void {
    this.sidePanelOpen = !this.sidePanelOpen;
  }

  recarregarPaineis(): void {
    this.service.listarHistorico().subscribe({
      next: (items) => {
        this.history = items;
        this.cd.markForCheck();
      },
    });
    this.service.listarConsultasSalvas().subscribe({
      next: (items) => {
        this.savedQueries = items;
        this.cd.markForCheck();
      },
    });
  }

  recarregarContexto(): void {
    this.carregarConexoes();
    this.recarregarPaineis();
  }

  aplicarHistorico(item: SqlHistoryItem): void {
    this.sql = item.sql;
    this.ambiente = item.ambiente;
    this.base = item.base;
    this.dangerCheck = this.checkDangerousSql(this.sql);
    this.carregarCatalogo();
  }

  aplicarConsultaSalva(item: SavedSqlQuery): void {
    this.sql = item.sql;
    this.dangerCheck = this.checkDangerousSql(this.sql);
  }

  formatarSql(): void {
    try {
      this.sql = format(this.sql, { language: 'postgresql' });
      this.dangerCheck = this.checkDangerousSql(this.sql);
      this.adicionarMensagem('success', 'SQL formatado', 'Consulta formatada com sql-formatter.');
    } catch {
      this.adicionarMensagem('warn', 'Nao foi possivel formatar', 'Verifique se a consulta SQL esta completa.');
    }
  }

  limparEditor(): void {
    this.sql = '';
    this.result = undefined;
    this.errorMessage = '';
    this.state = 'initial';
    this.dangerCheck = this.checkDangerousSql(this.sql);
    this.adicionarMensagem('info', 'Editor limpo', 'O conteudo do editor SQL foi removido.');
  }

  executar(sqlToExecute = this.sql, confirmado = false): void {
    const sql = sqlToExecute.trim();
    const validationMessage = this.validarExecucao(sql);
    if (validationMessage) {
      this.state = 'error';
      this.errorMessage = validationMessage;
      this.messageService.add({ severity: 'warn', summary: 'Consulta nao enviada', detail: validationMessage });
      this.adicionarMensagem('warn', 'Consulta nao enviada', validationMessage);
      return;
    }

    const danger = this.checkDangerousSql(sql);
    if (danger.dangerous && !confirmado && this.ambiente !== 'cloud') {
      this.pendingExecution = {
        sql,
        reason: danger.reason,
        riskLevel: danger.riskLevel || 'HIGH',
      };
      this.confirmationVisible = true;
      this.adicionarMensagem('warn', 'Confirmacao necessaria', danger.reason);
      return;
    }

    this.state = 'executing';
    this.applyAdaptiveLayout([55, 45]);
    this.errorMessage = '';
    this.cloudBlockedMessage = '';
    this.service
      .executar({
        ambiente: this.ambiente,
        conexaoId: this.conexaoId,
        base: this.base,
        sql,
        maxRows: this.maxRows,
        timeoutSeconds: this.timeoutSeconds,
        confirmado,
      })
      .pipe(finalize(() => this.cd.markForCheck()))
      .subscribe({
        next: (res) => {
          if (res.requiresConfirmation && !confirmado) {
            this.state = 'initial';
            this.pendingExecution = {
              sql,
              reason: res.message || 'A API solicitou confirmacao para executar esta consulta.',
              riskLevel: res.riskLevel || danger.riskLevel || 'HIGH',
            };
            this.confirmationVisible = true;
            this.adicionarMensagem('warn', 'Confirmacao solicitada pela API', this.pendingExecution.reason);
            return;
          }

          this.result = res;
          this.state = res.rows.length ? 'loaded' : 'empty';
          this.applyAdaptiveLayout([32, 68]);
          const linhas = `${res.rows.length} linhas retornadas, ${res.affectedRows ?? 0} linhas afetadas, ${res.executionTimeMs} ms.`;
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: res.message || 'Consulta executada.' });
          this.adicionarMensagem('success', res.message || 'Consulta executada com sucesso.', linhas);
          this.registrarHistorico(sql, res);
        },
        error: (error) => {
          if (error?.status === 403) {
            this.state = 'error';
            this.applyAdaptiveLayout([55, 45]);
            this.confirmationVisible = false;
            this.pendingExecution = undefined;
            this.errorMessage =
              error?.error?.message ||
              'Execucao SQL no ambiente cloud esta bloqueada pelas configuracoes do sistema.';
            this.cloudBlockedMessage =
              'Execucao SQL no Cloud esta desabilitada. Use o ambiente Local ou solicite habilitacao ao administrador.';
            this.messageService.add({
              severity: 'warn',
              summary: 'Cloud bloqueado',
              detail: this.cloudBlockedMessage,
            });
            this.adicionarMensagem('warn', 'Bloqueio por configuracao do sistema', this.errorMessage);
            return;
          }

          this.result = undefined;
          this.state = 'error';
          this.applyAdaptiveLayout([55, 45]);
          this.errorMessage = error?.error?.message || 'Erro ao executar consulta SQL.';
          this.messageService.add({ severity: 'error', summary: 'Erro', detail: this.errorMessage });
          this.adicionarMensagem('error', 'Erro ao executar consulta SQL', this.errorMessage);
        },
      });
  }

  usarAmbienteLocal(): void {
    this.ambiente = 'local';
    this.cloudBlockedMessage = '';
    this.carregarBases();
    this.adicionarMensagem('info', 'Ambiente alterado', 'Ambiente Local selecionado para a proxima execucao.');
  }

  confirmarExecucaoPerigosa(): void {
    const sql = this.pendingExecution?.sql;
    this.confirmationVisible = false;
    this.pendingExecution = undefined;
    if (sql) this.executar(sql, true);
  }

  cancelarExecucaoPerigosa(): void {
    this.confirmationVisible = false;
    this.adicionarMensagem('info', 'Execucao cancelada', 'A consulta de risco nao foi enviada para a API.');
    this.pendingExecution = undefined;
  }

  private carregarConexoes(): void {
    this.loadingConexoes = true;
    this.service
      .listarConexoes()
      .pipe(finalize(() => {
        this.loadingConexoes = false;
        this.cd.markForCheck();
      }))
      .subscribe({
        next: (items) => {
          this.conexoes = items;
          this.conexaoId = this.conexaoId || items[0]?.value || '';
          this.carregarBases();
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: error?.error?.message || 'Nao foi possivel carregar as conexoes da organizacao ativa.',

          });
        },
      });
  }

  private carregarBases(): void {
    if (!this.conexaoId) {
      this.bases = [];
      this.base = '';
      this.catalogoSql = undefined;
      return;
    }

    this.loadingBases = true;
    this.service
      .listarBases(this.ambiente, this.conexaoId)
      .pipe(
        finalize(() => {
          this.loadingBases = false;
          this.cd.markForCheck();
        })
      )
      .subscribe({
        next: (items) => {
          this.bases = items;
          const baseAtualExiste = items.some((item) => item.value === this.base);
          this.base = baseAtualExiste ? this.base : items[0]?.value || '';
          this.carregarCatalogo();
        },
        error: (error) => {
          this.bases = [];
          this.base = '';
          this.catalogoSql = undefined;
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: error?.error?.message || 'Nao foi possivel carregar os bancos de dados da conexao selecionada.',
          });
        },
      });
  }

  private carregarCatalogo(): void {
    if (!this.conexaoId || !this.base.trim()) {
      this.catalogoSql = undefined;
      return;
    }

    const contexto = `${this.ambiente}:${this.conexaoId}:${this.base}`;

    this.service.listarCatalogo(this.ambiente, this.conexaoId, this.base).subscribe({
      next: (catalogo) => {
        if (contexto !== `${this.ambiente}:${this.conexaoId}:${this.base}`) return;

        this.catalogoSql = catalogo;
        this.cd.markForCheck();
      },
      error: () => {
        if (contexto !== `${this.ambiente}:${this.conexaoId}:${this.base}`) return;

        this.catalogoSql = undefined;
        this.cd.markForCheck();
      },
    });
  }

  private validarExecucao(sql: string): string {
    if (!sql) return 'Informe um comando SQL para executar.';
    if (!this.conexaoId) return 'Selecione uma conexao da organizacao ativa.';
    if (!this.base.trim()) return 'Informe a base de dados.';
    if (!this.maxRows || this.maxRows < 1) return 'Informe um valor valido para Max rows.';
    if (!this.timeoutSeconds || this.timeoutSeconds < 1) return 'Informe um timeout valido.';

    return '';
  }

  private checkDangerousSql(sql: string): DangerousSqlCheck {
    const executableSql = this.removerComentarios(sql).trim();
    const normalized = executableSql.replace(/\s+/g, ' ').trim().toUpperCase();
    if (!normalized) return { dangerous: false, reason: '' };

    if (/\b(DROP|TRUNCATE|ALTER)\b/.test(normalized)) {
      return {
        dangerous: true,
        riskLevel: 'HIGH',
        reason: 'Comando estrutural potencialmente destrutivo detectado. Confirme para executar.',
      };
    }

    if (/\bDELETE\s+FROM\b/.test(normalized) && !/\bWHERE\b/.test(normalized)) {
      return {
        dangerous: true,
        riskLevel: 'CRITICAL',
        reason: 'DELETE sem WHERE detectado. Este comando pode afetar todos os registros.',
      };
    }

    if (/\bUPDATE\b/.test(normalized) && !/\bWHERE\b/.test(normalized)) {
      return {
        dangerous: true,
        riskLevel: 'CRITICAL',
        reason: 'UPDATE sem WHERE detectado. Este comando pode afetar todos os registros.',
      };
    }

    return { dangerous: false, reason: '' };
  }

  private registrarHistorico(sql: string, res: SqlExecutionResponse): void {
    this.history = [
      {
        id: crypto.randomUUID(),
        sql,
        ambiente: this.ambiente,
        base: this.base,
        executedAt: new Date().toISOString(),
        executionTimeMs: res.executionTimeMs,
        affectedRows: res.affectedRows,
        riskLevel: res.riskLevel,
      },
      ...this.history,
    ].slice(0, 30);
  }

  private adicionarMensagem(severity: SqlMessage['severity'], title: string, detail: string): void {
    this.messages = [
      {
        severity,
        title,
        detail,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
      },
      ...this.messages,
    ].slice(0, 50);
  }

  private removerComentarios(sql: string): string {
    return sql
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*--.*$/gm, '');
  }

  private applyAdaptiveLayout(sizes: number[]): void {
    if (this.workspaceMode !== 'adaptive') return;

    this.editorPanePercent = sizes[0] || this.editorPanePercent;
    this.scheduleLayoutRefresh();
  }

  private scheduleLayoutRefresh(): void {
    setTimeout(() => this.cd.markForCheck());
  }

  private formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) return `${milliseconds} ms`;
    return `${(milliseconds / 1000).toFixed(2)}s`;
  }

  private estimateResultSize(rows: Record<string, unknown>[]): string {
    if (!rows.length) return '0 KB';

    const bytes = new Blob([JSON.stringify(rows)]).size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;

    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  private buildColumnStatistic(name: string, rows: Record<string, unknown>[]): SqlColumnStatistic {
    const values = rows.map((row) => row[name]);
    const nonNullValues = values.filter((value) => value !== null && value !== undefined && value !== '');
    const numericValues = nonNullValues
      .map((value) => Number(String(value).replace(',', '.')))
      .filter((value) => Number.isFinite(value));
    const distinct = new Set(nonNullValues.map((value) => String(value))).size;
    const nullPercent = Math.round(((values.length - nonNullValues.length) / Math.max(values.length, 1)) * 100);

    if (numericValues.length === nonNullValues.length && numericValues.length) {
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);
      const average = numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;

      return {
        name,
        type: 'numeric',
        distinct,
        nullPercent,
        min: this.formatStatisticNumber(min),
        max: this.formatStatisticNumber(max),
        average: this.formatStatisticNumber(average),
      };
    }

    const sortedValues = nonNullValues.map((value) => String(value)).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    return {
      name,
      type: nonNullValues.every((value) => !Number.isNaN(Date.parse(String(value)))) ? 'date' : 'text',
      distinct,
      nullPercent,
      min: sortedValues[0],
      max: sortedValues.at(-1),
    };
  }

  private formatStatisticNumber(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      maximumFractionDigits: 2,
    }).format(value);
  }
}
