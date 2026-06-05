import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { ConnectionSelectorHeaderComponent } from '../components/connection-selector-header/connection-selector-header.component';
import { DataPreviewPanelComponent } from '../components/data-preview-panel/data-preview-panel.component';
import { DiffSummaryComponent } from '../components/diff-summary/diff-summary.component';
import { SchemaDiagramComponent } from '../components/schema-diagram/schema-diagram.component';
import { SidebarTreeComponent } from '../components/sidebar-tree/sidebar-tree.component';
import { SqlPreviewPanelComponent } from '../components/sql-preview-panel/sql-preview-panel.component';
import { TableActionsPanelComponent } from '../components/table-actions-panel/table-actions-panel.component';
import { TableDetailsPanelComponent } from '../components/table-details-panel/table-details-panel.component';
import { mapDiagramToVflow } from '../mappers/diagram-vflow.mapper';
import {
  AmbienteExplorador,
  BaseTreeNode,
  DadosTabelaPreview,
  DiagramNode,
  DiagramResponse,
  ExplorerView,
  ModoOperacao,
  SchemaTreeNode,
  SelectOption,
  TabelaDetalhe,
  TabelaResumo,
} from '../models/explorador-visual.model';
import { ExploradorVisualService } from '../services/explorador-visual.service';

@Component({
  selector: 'app-explorador-visual-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ProgressSpinnerModule,
    TagModule,
    ConnectionSelectorHeaderComponent,
    SidebarTreeComponent,
    SchemaDiagramComponent,
    TableDetailsPanelComponent,
    TableActionsPanelComponent,
    DiffSummaryComponent,
    DataPreviewPanelComponent,
    SqlPreviewPanelComponent,
  ],
  template: `
    <div class="db-explorer">
      <aside class="icon-rail">
        <div class="rail-logo">DB</div>
        <button type="button" class="active" title="Bancos"><i class="pi pi-database"></i></button>
        <button type="button" title="Diagrama"><i class="pi pi-sitemap"></i></button>
        <button type="button" title="SQL"><i class="pi pi-code"></i></button>
        <button type="button" title="Historico"><i class="pi pi-history"></i></button>
        <span></span>
        <button type="button" title="Ajuda"><i class="pi pi-question-circle"></i></button>
      </aside>

      <section class="explorer-shell">
        <app-explorador-connection-selector-header
          [conexao]="idConexao"
          [ambiente]="ambiente"
          [modoOperacao]="modoOperacao"
          [conexoes]="conexoes"
          [ambientes]="ambientes"
          [loadingConexoes]="loadingConexoes"
          (conexaoChange)="onConexaoChange($event)"
          (ambienteChange)="onAmbienteChange($event)"
          (modoOperacaoChange)="onModoOperacaoChange($event)"
          (refresh)="recarregarAtual()"
        />

        <div class="content-grid">
          <app-explorador-sidebar-tree
            [bases]="bases"
            [selectedBase]="base"
            [selectedSchema]="schema"
            [selectedTableId]="selectedTableId"
            [loadingBases]="loadingBases"
            (baseToggle)="toggleBase($event)"
            (schemaToggle)="toggleSchema($event.base, $event.schema)"
            (tableSelected)="selecionarTabela($event.base, $event.schema, $event.tabela)"
          />

          <main class="main-pane">
            <section class="pane-header">
              <div>
                <h2>{{ tituloPrincipal() }}</h2>
                <span>{{ subtituloPrincipal() }}</span>
              </div>

              <div class="pane-actions">
                <input
                  type="text"
                  [(ngModel)]="termoBusca"
                  placeholder="Buscar tabela..."
                  *ngIf="view === 'tables'"
                />
                <p-button
                  label="Diagrama ER"
                  icon="pi pi-sitemap"
                  severity="secondary"
                  [outlined]="true"
                  [disabled]="!base || !schema"
                  (click)="carregarGrafoSchema()"
                />
                <p-button
                  label="Comparar"
                  icon="pi pi-arrows-h"
                  severity="secondary"
                  [outlined]="true"
                  [disabled]="!base || !schema"
                  (click)="compararSchema()"
                />
              </div>
            </section>

            <section class="loading-area" *ngIf="loadingMain">
              <p-progress-spinner />
            </section>

            <section class="cards-grid" *ngIf="!loadingMain && view === 'bases'">
              <button type="button" class="object-card" *ngFor="let item of bases" (click)="toggleBase(item)">
                <div class="card-title"><i class="pi pi-database"></i><strong>{{ item.nome }}</strong></div>
                <p>Banco de dados</p>
                <span>{{ item.schemasLoaded ? item.schemas.length + ' schemas' : 'Clique para carregar schemas' }}</span>
              </button>
            </section>

            <section class="cards-grid" *ngIf="!loadingMain && view === 'schemas'">
              <button
                type="button"
                class="object-card"
                *ngFor="let item of selectedBaseNode?.schemas || []"
                (click)="toggleSchema(selectedBaseNode!, item)"
              >
                <div class="card-title"><i class="pi pi-table"></i><strong>{{ item.nome }}</strong></div>
                <p>Schema</p>
                <span>{{ item.tabelasLoaded ? item.tabelas.length + ' tabelas' : 'Clique para carregar tabelas' }}</span>
              </button>
            </section>

            <section class="table-grid" *ngIf="!loadingMain && view === 'tables'">
              <button
                type="button"
                class="table-card"
                *ngFor="let tabela of tabelasFiltradas()"
                [class.active]="tabela.id === selectedTableId"
                (click)="selecionarTabela(selectedBaseNode!, selectedSchemaNode!, tabela)"
              >
                <div class="table-card-head">
                  <div><i class="pi pi-th-large"></i><strong>{{ tabela.nome }}</strong></div>
                  <i class="pi pi-eye"></i>
                </div>
                <p>Colunas: {{ tabela.totalColunas ?? '-' }}</p>
                <p>Registros (est.): {{ tabela.registrosEstimados ?? '-' }}</p>
                <p>Tamanho: {{ tabela.tamanho || '-' }}</p>
                <p>Atualizado: {{ tabela.atualizadoEm || '-' }}</p>
              </button>
            </section>

            <app-explorador-schema-diagram
              *ngIf="!loadingMain && (view === 'diagram' || view === 'comparison')"
              [nodes]="nodes"
              [edges]="edges"
              [loading]="loadingDiagram"
              [selectedNodeId]="selectedNode?.id || ''"
              (tableSelected)="selecionarTabelaDoDiagrama($event)"
            />

            <section class="detail-layout" *ngIf="!loadingMain && view === 'table-detail'">
              <app-explorador-table-details-panel [detalhe]="detalhe" [loading]="loadingDetail" />
              <app-explorador-table-actions-panel
                [detalhe]="detalhe"
                [ambiente]="ambiente"
                [loadingDados]="loadingDados"
                (visualizarDados)="carregarDadosTabela(0)"
              />
            </section>
          </main>
        </div>

        <section class="bottom-pane">
          <app-explorador-data-preview-panel
            *ngIf="view === 'table-detail'"
            [dados]="dados"
            [loading]="loadingDados"
          />
          <app-explorador-diff-summary
            *ngIf="view === 'comparison'"
            [resumo]="diagram?.resumo"
          />
          <app-explorador-sql-preview-panel
            [sql]="detalhe?.sqlPreview || ''"
            [loading]="loadingDetail"
          />
        </section>

        <footer class="breadcrumb-bar">
          <span class="env-dot"></span>
          <strong>{{ ambienteLabel() }}</strong>
          <i class="pi pi-angle-right"></i>
          <span>{{ base || 'base' }}</span>
          <i class="pi pi-angle-right"></i>
          <span>{{ schema || 'schema' }}</span>
          <i class="pi pi-angle-right"></i>
          <span>{{ detalhe?.nome || selectedTableId || 'objeto' }}</span>
        </footer>
      </section>
    </div>
  `,
  styles: [
    `
      .db-explorer {
        min-height: calc(100vh - 8rem);
        display: grid;
        grid-template-columns: 3.75rem minmax(0, 1fr);
        border: 1px solid rgba(148, 163, 184, 0.14);
        border-radius: 8px;
        overflow: hidden;
        background:
          radial-gradient(circle at top left, rgba(88, 80, 236, 0.14), transparent 34rem),
          #020617;
      }

      .icon-rail {
        display: grid;
        grid-template-rows: auto repeat(4, auto) 1fr auto;
        gap: 0.55rem;
        padding: 0.75rem 0.55rem;
        border-right: 1px solid rgba(148, 163, 184, 0.12);
        background: rgba(2, 6, 23, 0.9);
      }

      .rail-logo,
      .icon-rail button {
        width: 2.4rem;
        height: 2.4rem;
        display: grid;
        place-items: center;
        border-radius: 8px;
        color: #e2e8f0;
      }

      .rail-logo {
        font-weight: 800;
        color: #a78bfa;
      }

      .icon-rail button {
        border: 0;
        background: transparent;
        cursor: pointer;
      }

      .icon-rail button.active,
      .icon-rail button:hover {
        background: #4f46e5;
        color: #fff;
      }

      .explorer-shell {
        display: grid;
        grid-template-rows: auto minmax(0, 1fr) auto auto;
        min-width: 0;
      }

      .content-grid {
        display: grid;
        grid-template-columns: minmax(17rem, 20rem) minmax(0, 1fr);
        min-height: 46rem;
      }

      .main-pane {
        min-width: 0;
        padding: 0.85rem;
        background: rgba(15, 23, 42, 0.5);
      }

      .pane-header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: center;
        margin-bottom: 0.85rem;

        h2 {
          margin: 0;
          color: #f8fafc;
          font-size: 1.05rem;
        }

        span {
          color: #94a3b8;
          font-size: 0.85rem;
        }
      }

      .pane-actions {
        display: flex;
        gap: 0.55rem;
        align-items: center;
        flex-wrap: wrap;
        justify-content: flex-end;

        input {
          min-height: 2.35rem;
          width: 16rem;
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 6px;
          background: rgba(15, 23, 42, 0.72);
          color: #e2e8f0;
          padding: 0 0.75rem;
        }
      }

      .loading-area {
        min-height: 25rem;
        display: grid;
        place-items: center;
      }

      .cards-grid,
      .table-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(12rem, 1fr));
        gap: 0.75rem;
      }

      .object-card,
      .table-card {
        min-height: 8.7rem;
        padding: 0.85rem;
        border: 1px solid rgba(148, 163, 184, 0.18);
        border-radius: 8px;
        background: rgba(15, 23, 42, 0.76);
        color: #cbd5e1;
        text-align: left;
        cursor: pointer;
      }

      .object-card:hover,
      .table-card:hover,
      .table-card.active {
        border-color: #6d5dfc;
        box-shadow: 0 0 0 1px rgba(109, 93, 252, 0.35);
      }

      .card-title,
      .table-card-head,
      .table-card-head div {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .card-title strong,
      .table-card strong {
        color: #f8fafc;
      }

      .object-card p,
      .table-card p {
        margin: 0.55rem 0 0;
        color: #94a3b8;
        font-size: 0.82rem;
      }

      .object-card span {
        display: block;
        margin-top: 1rem;
        color: #a78bfa;
        font-size: 0.8rem;
      }

      .table-card-head {
        justify-content: space-between;
        margin-bottom: 0.75rem;
      }

      .detail-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(18rem, 24rem);
        gap: 0.85rem;
      }

      .bottom-pane {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(22rem, 34rem);
        gap: 0.85rem;
        padding: 0.85rem;
        border-top: 1px solid rgba(148, 163, 184, 0.14);
        background: rgba(2, 6, 23, 0.52);
      }

      .breadcrumb-bar {
        min-height: 2.6rem;
        display: flex;
        align-items: center;
        gap: 0.55rem;
        padding: 0 0.85rem;
        border-top: 1px solid rgba(148, 163, 184, 0.14);
        color: #94a3b8;
        font-size: 0.82rem;
      }

      .breadcrumb-bar strong {
        color: #e2e8f0;
      }

      .env-dot {
        width: 0.55rem;
        height: 0.55rem;
        border-radius: 999px;
        background: #22c55e;
      }

      @media (max-width: 1200px) {
        .cards-grid,
        .table-grid {
          grid-template-columns: repeat(2, minmax(12rem, 1fr));
        }

        .detail-layout,
        .bottom-pane {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ExploradorVisualPage implements OnInit {
  idConexao = '';
  modoOperacao: ModoOperacao = 'explorar';
  ambiente: AmbienteExplorador = 'cloud';
  ambientes: SelectOption[] = [
    { label: 'Cloud', value: 'cloud' },
    { label: 'Local', value: 'local' },
  ];
  conexoes: SelectOption[] = [];
  bases: BaseTreeNode[] = [];
  selectedBaseNode?: BaseTreeNode;
  selectedSchemaNode?: SchemaTreeNode;
  base = '';
  schema = '';
  selectedTableId = '';
  view: ExplorerView = 'bases';
  termoBusca = '';
  diagram?: DiagramResponse;
  detalhe?: TabelaDetalhe;
  dados?: DadosTabelaPreview;
  selectedNode?: DiagramNode;
  nodes: any[] = [];
  edges: any[] = [];
  loadingConexoes = false;
  loadingBases = false;
  loadingMain = false;
  loadingDiagram = false;
  loadingDetail = false;
  loadingDados = false;

  private readonly service = inject(ExploradorVisualService);
  private readonly messageService = inject(MessageService);
  private readonly cd = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.carregarConexoes();
  }

  onConexaoChange(idConexao: string): void {
    this.idConexao = idConexao;
    this.carregarAmbientes();
    this.recarregarBases();
  }

  onAmbienteChange(ambiente: AmbienteExplorador): void {
    this.ambiente = ambiente;
    this.modoOperacao = 'explorar';
    this.recarregarBases();
  }

  onModoOperacaoChange(modo: ModoOperacao): void {
    this.modoOperacao = modo;
    this.limparSelecaoProfunda();
    if (modo === 'comparar' && this.base && this.schema) {
      this.compararSchema();
    }
  }

  recarregarAtual(): void {
    if (!this.idConexao) return;
    if (this.view === 'tables' && this.selectedBaseNode && this.selectedSchemaNode) {
      this.selectedSchemaNode.tabelasLoaded = false;
      this.carregarTabelas(this.selectedBaseNode, this.selectedSchemaNode);
      return;
    }
    this.recarregarBases();
  }

  toggleBase(base: BaseTreeNode): void {
    this.selectedBaseNode = base;
    this.base = base.nome;
    this.schema = '';
    this.selectedSchemaNode = undefined;
    this.selectedTableId = '';
    this.limparConteudo();
    base.expanded = !base.expanded;
    this.view = 'schemas';

    if (!base.schemasLoaded) {
      this.carregarSchemas(base);
    }
  }

  toggleSchema(base: BaseTreeNode, schema: SchemaTreeNode): void {
    this.selectedBaseNode = base;
    this.selectedSchemaNode = schema;
    this.base = base.nome;
    this.schema = schema.nome;
    this.selectedTableId = '';
    this.limparConteudo();
    schema.expanded = !schema.expanded;
    this.view = 'tables';

    if (!schema.tabelasLoaded) {
      this.carregarTabelas(base, schema);
    }
  }

  selecionarTabela(base: BaseTreeNode, schema: SchemaTreeNode, tabela: TabelaResumo): void {
    this.selectedBaseNode = base;
    this.selectedSchemaNode = schema;
    this.base = base.nome;
    this.schema = schema.nome;
    this.selectedTableId = tabela.id;
    this.view = 'table-detail';
    this.dados = undefined;
    this.carregarDetalheTabela(tabela.id);
  }

  selecionarTabelaDoDiagrama(node: DiagramNode): void {
    this.selectedNode = node;
    this.selectedTableId = node.id;
    this.view = this.modoOperacao === 'comparar' ? 'comparison' : 'table-detail';
    const tabela = this.modoOperacao === 'comparar' ? node.id : node.id;
    this.carregarDetalheTabela(tabela);
  }

  carregarGrafoSchema(): void {
    if (!this.idConexao || !this.base || !this.schema) return;
    this.view = 'diagram';
    this.loadingDiagram = true;
    this.loadingMain = true;
    this.service
      .grafoSchemaAmbiente(this.ambiente, this.base, this.schema, this.idConexao)
      .pipe(finalize(() => this.finalizarMain()))
      .subscribe({
        next: (res) => this.aplicarDiagrama(res),
        error: () => this.exibirErro('Nao foi possivel carregar o diagrama do schema.'),
      });
  }

  compararSchema(): void {
    if (!this.idConexao || !this.base || !this.schema) return;
    this.modoOperacao = 'comparar';
    this.view = 'comparison';
    this.loadingDiagram = true;
    this.loadingMain = true;
    this.service
      .compararSchema(this.base, this.schema, this.idConexao)
      .pipe(finalize(() => this.finalizarMain()))
      .subscribe({
        next: (res) => this.aplicarDiagrama(res),
        error: () => this.exibirErro('Nao foi possivel comparar Cloud x Local.'),
      });
  }

  carregarDadosTabela(page = 0): void {
    if (!this.detalhe || !this.idConexao || !this.base || !this.schema) return;
    this.loadingDados = true;
    this.service
      .listarDadosTabela(this.ambiente, this.base, this.schema, this.detalhe.id, page, 100, this.idConexao)
      .pipe(finalize(() => this.finalizarLoadingDados()))
      .subscribe({
        next: (res) => {
          this.dados = res;
          this.cd.markForCheck();
        },
        error: () => this.exibirErro('Nao foi possivel carregar os dados da tabela.'),
      });
  }

  tabelasFiltradas(): TabelaResumo[] {
    const tabelas = this.selectedSchemaNode?.tabelas || [];
    const termo = this.termoBusca.trim().toLowerCase();
    return termo ? tabelas.filter((item) => item.nome.toLowerCase().includes(termo)) : tabelas;
  }

  tituloPrincipal(): string {
    if (this.view === 'bases') return 'Bancos de dados';
    if (this.view === 'schemas') return `Schemas - ${this.base}`;
    if (this.view === 'tables') return `Tabelas - ${this.schema}`;
    if (this.view === 'diagram') return `Diagrama ER - ${this.schema}`;
    if (this.view === 'comparison') return `Comparacao - ${this.schema}`;
    return this.detalhe ? `${this.detalhe.schema}.${this.detalhe.nome}` : 'Detalhe da tabela';
  }

  subtituloPrincipal(): string {
    if (this.view === 'tables') return `${this.tabelasFiltradas().length} tabelas`;
    if (this.view === 'schemas') return `${this.selectedBaseNode?.schemas.length || 0} schemas`;
    if (this.view === 'diagram' || this.view === 'comparison') return `${this.nodes.length} tabelas, ${this.edges.length} relacoes`;
    return this.modoOperacao === 'explorar' ? 'Navegacao lazy loading por ambiente' : 'Cloud x Local';
  }

  ambienteLabel(): string {
    return this.ambiente === 'cloud' ? 'Cloud' : 'Local';
  }

  private carregarConexoes(): void {
    this.loadingConexoes = true;
    this.service
      .listarConexoes()
      .pipe(finalize(() => this.finalizarLoadingConexoes()))
      .subscribe({
        next: (res) => {
          this.conexoes = res;
          this.idConexao = res[0]?.value || '';
          this.carregarAmbientes();
          if (this.idConexao) this.recarregarBases();
        },
        error: () => this.exibirErro('Nao foi possivel carregar as conexoes.'),
      });
  }

  private carregarAmbientes(): void {
    this.service.listarAmbientes(this.idConexao).subscribe({
      next: (res) => {
        if (res.length) {
          this.ambientes = res;
          this.ambiente = (res[0].value as AmbienteExplorador) || 'cloud';
        }
      },
      error: () => {
        this.ambientes = [
          { label: 'Cloud', value: 'cloud' },
          { label: 'Local', value: 'local' },
        ];
      },
    });
  }

  private recarregarBases(): void {
    this.limparSelecaoProfunda();
    if (!this.idConexao) return;
    this.loadingBases = true;
    this.service
      .listarBasesAmbiente(this.ambiente, this.idConexao)
      .pipe(finalize(() => this.finalizarLoadingBases()))
      .subscribe({
        next: (res) => {
          this.bases = res;
          this.view = 'bases';
        },
        error: () => this.exibirErro('Nao foi possivel carregar os bancos.'),
      });
  }

  private carregarSchemas(base: BaseTreeNode): void {
    base.loading = true;
    this.loadingMain = true;
    this.service
      .listarSchemasAmbiente(this.ambiente, base.nome, this.idConexao)
      .pipe(finalize(() => this.finalizarNode(base)))
      .subscribe({
        next: (res) => {
          base.schemas = res.map((schema) => ({
            nome: schema.value,
            expanded: false,
            loading: false,
            tabelasLoaded: false,
            tabelas: [],
          }));
          base.schemasLoaded = true;
          this.cd.markForCheck();
        },
        error: () => this.exibirErro('Nao foi possivel carregar os schemas.'),
      });
  }

  private carregarTabelas(base: BaseTreeNode, schema: SchemaTreeNode): void {
    schema.loading = true;
    this.loadingMain = true;
    this.service
      .listarTabelasAmbiente(this.ambiente, base.nome, schema.nome, this.idConexao)
      .pipe(finalize(() => this.finalizarNode(schema)))
      .subscribe({
        next: (res) => {
          schema.tabelas = res;
          schema.tabelasLoaded = true;
          this.view = 'tables';
          this.cd.markForCheck();
        },
        error: () => this.exibirErro('Nao foi possivel carregar as tabelas.'),
      });
  }

  private carregarDetalheTabela(tabela: string): void {
    if (!this.idConexao || !this.base || !this.schema) return;
    this.loadingDetail = true;
    this.detalhe = undefined;
    const request =
      this.modoOperacao === 'comparar'
        ? this.service.detalharTabela(this.base, this.schema, tabela, this.idConexao)
        : this.service.detalharTabelaAmbiente(this.ambiente, this.base, this.schema, tabela, this.idConexao);

    request
      .pipe(finalize(() => this.finalizarLoadingDetail()))
      .subscribe({
        next: (res) => {
          this.detalhe = res;
          this.cd.markForCheck();
        },
        error: () => this.exibirErro('Nao foi possivel carregar o detalhe da tabela.'),
      });
  }

  private aplicarDiagrama(res: DiagramResponse): void {
    this.diagram = res;
    const diagram = mapDiagramToVflow(res, 'schema_completo');
    this.nodes = diagram.nodes;
    this.edges = diagram.edges;
    this.cd.markForCheck();
  }

  private limparSelecaoProfunda(): void {
    this.base = '';
    this.schema = '';
    this.selectedBaseNode = undefined;
    this.selectedSchemaNode = undefined;
    this.selectedTableId = '';
    this.bases = [];
    this.limparConteudo();
  }

  private limparConteudo(): void {
    this.diagram = undefined;
    this.detalhe = undefined;
    this.dados = undefined;
    this.selectedNode = undefined;
    this.nodes = [];
    this.edges = [];
  }

  private finalizarNode(node: { loading: boolean }): void {
    node.loading = false;
    this.finalizarMain();
  }

  private finalizarMain(): void {
    this.loadingMain = false;
    this.loadingDiagram = false;
    this.cd.markForCheck();
  }

  private finalizarLoadingConexoes(): void {
    this.loadingConexoes = false;
    this.cd.markForCheck();
  }

  private finalizarLoadingBases(): void {
    this.loadingBases = false;
    this.cd.markForCheck();
  }

  private finalizarLoadingDetail(): void {
    this.loadingDetail = false;
    this.cd.markForCheck();
  }

  private finalizarLoadingDados(): void {
    this.loadingDados = false;
    this.cd.markForCheck();
  }

  private exibirErro(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Erro', detail });
  }
}
