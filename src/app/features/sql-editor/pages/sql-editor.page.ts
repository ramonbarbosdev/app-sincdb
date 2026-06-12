import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { finalize } from 'rxjs';
import { MessageService } from 'primeng/api';
import { SqlCodeEditorComponent } from '../components/sql-code-editor/sql-code-editor.component';
import { SqlEditorHeaderComponent } from '../components/sql-editor-header/sql-editor-header.component';
import { SqlEditorToolbarComponent } from '../components/sql-editor-toolbar/sql-editor-toolbar.component';
import { SqlHistoryPanelComponent } from '../components/sql-history-panel/sql-history-panel.component';
import { SqlResultPanelComponent } from '../components/sql-result-panel/sql-result-panel.component';
import { SqlSavedQueriesPanelComponent } from '../components/sql-saved-queries-panel/sql-saved-queries-panel.component';
import {
  DangerousSqlCheck,
  SavedSqlQuery,
  SelectOption,
  SqlEditorState,
  SqlEnvironment,
  SqlExecutionResponse,
  SqlHistoryItem,
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

@Component({
  selector: 'app-sql-editor-page',
  standalone: true,
  imports: [
    CommonModule,
    SqlEditorHeaderComponent,
    SqlEditorToolbarComponent,
    SqlCodeEditorComponent,
    SqlResultPanelComponent,
    SqlHistoryPanelComponent,
    SqlSavedQueriesPanelComponent,
  ],
  template: `
    <div class="sql-editor-shell">
      <app-sql-editor-header
        (novo)="novaConsulta()"
        (salvar)="salvarConsulta()"
        (historico)="toggleHistory()"
      />

      <app-sql-editor-toolbar
        [ambiente]="ambiente"
        [conexaoId]="conexaoId"
        [base]="base"
        [connected]="connected"
        [ambientes]="ambientes"
        [conexoes]="conexoes"
        [bases]="bases"
        [loadingConexoes]="loadingConexoes"
        [loadingBases]="loadingBases"
        (ambienteChange)="onAmbienteChange($event)"
        (conexaoIdChange)="onConexaoChange($event)"
        (baseChange)="base = $event"
        (refresh)="recarregarContexto()"
      />

      <div class="workspace">
        <aside class="inner-sidebar" [class.compact]="!sidePanelOpen">
          <app-sql-saved-queries-panel
            *ngIf="sidePanelOpen"
            [items]="savedQueries"
            (selected)="aplicarConsultaSalva($event)"
          />
          <app-sql-history-panel
            *ngIf="sidePanelOpen"
            [items]="history"
            (selected)="aplicarHistorico($event)"
          />
        </aside>

        <main class="editor-area">
          <app-sql-code-editor
            [sql]="sql"
            [executing]="state === 'executing'"
            [danger]="dangerCheck"
            (sqlChange)="onSqlChange($event)"
            (formatar)="formatarSql()"
            (executar)="executar()"
          />

          <app-sql-result-panel [state]="state" [result]="result" [errorMessage]="errorMessage" />
        </main>
      </div>

      <footer class="sql-statusbar">
        <span class="env-dot"></span>
        <strong>{{ ambiente === 'cloud' ? 'Cloud' : 'Local' }}</strong>
        <i class="pi pi-angle-right"></i>
        <span>{{ conexaoLabel }}</span>
        <i class="pi pi-angle-right"></i>
        <span>{{ base }}</span>
        <span class="spacer"></span>
        <span>{{ statusLabel }}</span>
      </footer>
    </div>
  `,
  styles: [
    `
      .sql-editor-shell {
        min-height: calc(100vh - 8rem);
        display: grid;
        grid-template-rows: auto auto minmax(0, 1fr) auto;
        border: 1px solid rgba(148, 163, 184, 0.14);
        border-radius: 8px;
        overflow: hidden;
        background:
          radial-gradient(circle at top left, rgba(127, 90, 240, 0.12), transparent 31rem),
          #16161a;
      }

      .workspace {
        display: grid;
        grid-template-columns: minmax(15rem, 18rem) minmax(0, 1fr);
        gap: 0.85rem;
        min-width: 0;
        padding: 0.85rem;
      }

      .inner-sidebar {
        display: grid;
        align-content: start;
        gap: 0.85rem;
        min-width: 0;
      }

      .inner-sidebar.compact {
        display: none;
      }

      .editor-area {
        display: grid;
        gap: 0.85rem;
        min-width: 0;
      }

      .sql-statusbar {
        min-height: 2.6rem;
        display: flex;
        align-items: center;
        gap: 0.55rem;
        padding: 0 0.85rem;
        border-top: 1px solid rgba(148, 163, 184, 0.14);
        color: #94a1b2;
        font-size: 0.82rem;
        background: #16161a;
      }

      .sql-statusbar strong {
        color: #fffffe;
      }

      .env-dot {
        width: 0.55rem;
        height: 0.55rem;
        border-radius: 999px;
        background: #7f5af0;
      }

      .spacer {
        flex: 1;
      }

      @media (max-width: 1100px) {
        .workspace {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class SqlEditorPage implements OnInit {
  ambiente: SqlEnvironment = 'cloud';
  conexaoId = '';
  base = 'w5i_homologacao';
  connected = true;
  sql = INITIAL_SQL;
  state: SqlEditorState = 'initial';
  result?: SqlExecutionResponse;
  errorMessage = '';
  sidePanelOpen = true;
  loadingConexoes = false;
  loadingBases = false;
  history: SqlHistoryItem[] = [];
  savedQueries: SavedSqlQuery[] = [];

  ambientes: SelectOption[] = [
    { label: 'Cloud', value: 'cloud' },
    { label: 'Local', value: 'local' },
  ];

  conexoes: SelectOption[] = [];
  bases: SelectOption[] = [];

  dangerCheck: DangerousSqlCheck = { dangerous: false, reason: '' };

  private readonly service = inject(SqlEditorService);
  private readonly messageService = inject(MessageService);
  private readonly cd = inject(ChangeDetectorRef);

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

  ngOnInit(): void {
    this.carregarConexoes();
    this.recarregarPaineis();
    this.dangerCheck = this.checkDangerousSql(this.sql);
  }

  onAmbienteChange(ambiente: SqlEnvironment): void {
    this.ambiente = ambiente;
    this.carregarBases();
  }

  onConexaoChange(conexaoId: string): void {
    this.conexaoId = conexaoId;
    this.carregarBases();
  }

  onSqlChange(sql: string): void {
    this.sql = sql;
    this.dangerCheck = this.checkDangerousSql(sql);
  }

  novaConsulta(): void {
    this.sql = INITIAL_SQL;
    this.result = undefined;
    this.errorMessage = '';
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
  }

  aplicarConsultaSalva(item: SavedSqlQuery): void {
    this.sql = item.sql;
    this.dangerCheck = this.checkDangerousSql(this.sql);
  }

  formatarSql(): void {
    this.sql = this.sql
      .replace(/\bselect\b/gi, 'SELECT')
      .replace(/\bfrom\b/gi, '\nFROM')
      .replace(/\bwhere\b/gi, '\nWHERE')
      .replace(/\border by\b/gi, '\nORDER BY')
      .replace(/\blimit\b/gi, '\nLIMIT')
      .replace(/\n{2,}/g, '\n')
      .trim();
    this.dangerCheck = this.checkDangerousSql(this.sql);
  }

  executar(): void {
    const validationMessage = this.validarExecucao();
    if (validationMessage) {
      this.state = 'error';
      this.errorMessage = validationMessage;
      this.messageService.add({ severity: 'warn', summary: 'Consulta nao enviada', detail: validationMessage });
      return;
    }

    this.state = 'executing';
    this.errorMessage = '';
    this.service
      .executar({
        ambiente: this.ambiente,
        conexaoId: this.conexaoId,
        base: this.base,
        sql: this.sql,
      })
      .pipe(finalize(() => this.cd.markForCheck()))
      .subscribe({
        next: (res) => {
          this.result = res;
          this.state = res.rows.length ? 'loaded' : 'empty';
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: res.message || 'Consulta executada.' });
          this.recarregarPaineis();
        },
        error: (error) => {
          this.result = undefined;
          this.state = 'error';
          this.errorMessage = error?.error?.message || 'Erro ao executar consulta SQL.';
          this.messageService.add({ severity: 'error', summary: 'Erro', detail: this.errorMessage });
        },
      });
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
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: 'Nao foi possivel carregar as conexoes da organizacao ativa.',
          });
        },
      });
  }

  private carregarBases(): void {
    if (!this.conexaoId) {
      this.bases = [];
      this.base = '';
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
        },
        error: () => {
          this.bases = [];
          this.base = '';
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: 'Nao foi possivel carregar os bancos de dados da conexao selecionada.',
          });
        },
      });
  }

  private validarExecucao(): string {
    const sql = this.sql.trim();
    const executableSql = this.removerComentarios(sql).trim();

    if (!sql) return 'Informe uma consulta SQL SELECT para executar.';
    if (!this.conexaoId) return 'Selecione uma conexao da organizacao ativa.';
    if (!this.base.trim()) return 'Informe a base de dados.';
    if (!/^SELECT\b/i.test(executableSql)) return 'O SQL Editor envia somente consultas SELECT.';
    if (!/\bLIMIT\b/i.test(executableSql)) {
      return 'Consulta SELECT deve conter LIMIT. Exemplo: SELECT * FROM public.usuario LIMIT 100;';
    }

    return '';
  }

  private checkDangerousSql(sql: string): DangerousSqlCheck {
    const executableSql = this.removerComentarios(sql).trim();
    const normalized = executableSql.replace(/\s+/g, ' ').trim().toUpperCase();
    if (!normalized) return { dangerous: false, reason: '' };

    if (!/^SELECT\b/.test(normalized)) {
      return {
        dangerous: true,
        reason: 'Somente consultas SELECT serao enviadas para a API.',
      };
    }

    if (!/\bLIMIT\b/.test(normalized)) {
      return {
        dangerous: true,
        reason: 'Inclua LIMIT na consulta. A API bloqueia SELECT sem LIMIT.',
      };
    }

    if (/\b(DROP|TRUNCATE|ALTER)\b/.test(normalized)) {
      return {
        dangerous: true,
        reason: 'Comando potencialmente perigoso detectado. Uma confirmacao dedicada sera exigida futuramente.',
      };
    }

    if (/\bDELETE\s+FROM\b/.test(normalized) && !/\bWHERE\b/.test(normalized)) {
      return {
        dangerous: true,
        reason: 'DELETE sem WHERE detectado. Prepare confirmacao antes de liberar execucao real.',
      };
    }

    if (/\bUPDATE\b/.test(normalized) && !/\bWHERE\b/.test(normalized)) {
      return {
        dangerous: true,
        reason: 'UPDATE sem WHERE detectado. Prepare confirmacao antes de liberar execucao real.',
      };
    }

    return { dangerous: false, reason: '' };
  }

  private removerComentarios(sql: string): string {
    return sql
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*--.*$/gm, '');
  }
}
