import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { finalize } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ConnectionSelectorHeaderComponent } from '../components/connection-selector-header/connection-selector-header.component';
import { DataPreviewPanelComponent } from '../components/data-preview-panel/data-preview-panel.component';
import { DiffSummaryComponent } from '../components/diff-summary/diff-summary.component';
import { EnvironmentSwitchComponent } from '../components/environment-switch/environment-switch.component';
import { SchemaDiagramComponent } from '../components/schema-diagram/schema-diagram.component';
import { SidebarTreeComponent } from '../components/sidebar-tree/sidebar-tree.component';
import { SqlPreviewPanelComponent } from '../components/sql-preview-panel/sql-preview-panel.component';
import { TableActionsPanelComponent } from '../components/table-actions-panel/table-actions-panel.component';
import { TableDetailsPanelComponent } from '../components/table-details-panel/table-details-panel.component';
import { mapDiagramToVflow } from '../mappers/diagram-vflow.mapper';
import {
  AmbienteExplorador,
  DadosTabelaPreview,
  DiagramNode,
  DiagramResponse,
  ModoOperacao,
  ModoVisualizacao,
  SchemaResumo,
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
    ConnectionSelectorHeaderComponent,
    EnvironmentSwitchComponent,
    SidebarTreeComponent,
    SchemaDiagramComponent,
    TableDetailsPanelComponent,
    TableActionsPanelComponent,
    DiffSummaryComponent,
    DataPreviewPanelComponent,
    SqlPreviewPanelComponent,
  ],
  template: `
    <div class="explorer-page">
      <app-explorador-connection-selector-header
        [conexao]="idConexao"
        [modoOperacao]="modoOperacao"
        [base]="base"
        [schema]="schema"
        [modoVisualizacao]="modoVisualizacao"
        [conexoes]="conexoes"
        [bases]="bases"
        [schemas]="schemaOptions"
        [loadingConexoes]="loadingConexoes"
        [loadingBases]="loadingBases"
        [loadingSchemas]="loadingSchemas"
        [loadingComparacao]="loadingDiagram"
        (conexaoChange)="onConexaoChange($event)"
        (modoOperacaoChange)="onModoOperacaoChange($event)"
        (baseChange)="onBaseChange($event)"
        (schemaChange)="onSchemaChange($event)"
        (modoVisualizacaoChange)="onModoVisualizacaoChange($event)"
        (comparar)="compararSchema()"
      />

      <app-explorador-environment-switch
        *ngIf="modoOperacao === 'explorar'"
        [ambiente]="ambiente"
        [disabled]="!idConexao"
        (ambienteChange)="onAmbienteChange($event)"
      />

      <div class="mode-banner" [class.compare]="modoOperacao === 'comparar'">
        <i class="pi" [ngClass]="modoOperacao === 'explorar' ? 'pi-compass' : 'pi-arrows-h'"></i>
        <strong>
          {{
            modoOperacao === 'explorar'
              ? 'Modo Explorar: operando somente no ambiente ' + ambienteLabel()
              : 'Modo Comparar: comparando Cloud x Local'
          }}
        </strong>
      </div>

      <section class="workspace">
        <app-explorador-sidebar-tree
          [modoOperacao]="modoOperacao"
          [schemas]="schemasComparacao"
          [tabelas]="tabelas"
          [selectedSchema]="schema"
          [selectedTableId]="selectedTableId"
          [loading]="loadingSchemas || loadingTabelas"
          (schemaSelected)="onSchemaChange($event)"
          (tableSelected)="selecionarTabelaExploracao($event)"
        />

        <app-explorador-schema-diagram
          [nodes]="nodes"
          [edges]="edges"
          [loading]="loadingDiagram"
          [selectedNodeId]="selectedNode?.id || ''"
          (tableSelected)="selecionarTabelaDiagrama($event)"
        />

        <div class="right-stack">
          <app-explorador-table-details-panel [detalhe]="detalhe" [loading]="loadingDetail" />
          <app-explorador-table-actions-panel
            *ngIf="modoOperacao === 'explorar'"
            [detalhe]="detalhe"
            [ambiente]="ambiente"
            [loadingDados]="loadingDados"
            (visualizarDados)="carregarDadosTabela()"
          />
        </div>
      </section>

      <section class="bottom-grid">
        <app-explorador-diff-summary
          *ngIf="modoOperacao === 'comparar'"
          [resumo]="diagram?.resumo"
        />
        <app-explorador-data-preview-panel
          *ngIf="modoOperacao === 'explorar'"
          [dados]="dados"
          [loading]="loadingDados"
        />
        <app-explorador-sql-preview-panel
          [sql]="detalhe?.sqlPreview || ''"
          [loading]="loadingDetail"
        />
      </section>
    </div>
  `,
  styles: [
    `
      .explorer-page {
        display: grid;
        gap: 1rem;
      }

      .mode-banner {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        padding: 0.75rem 1rem;
        border: 1px solid color-mix(in srgb, #22c55e 40%, var(--surface-border));
        border-radius: 8px;
        background: color-mix(in srgb, #22c55e 8%, var(--surface-card));
        color: var(--text-color);
      }

      .mode-banner.compare {
        border-color: color-mix(in srgb, #f59e0b 45%, var(--surface-border));
        background: color-mix(in srgb, #f59e0b 9%, var(--surface-card));
      }

      .workspace {
        display: grid;
        grid-template-columns: minmax(15rem, 18rem) minmax(0, 1fr) minmax(18rem, 23rem);
        gap: 1rem;
        align-items: start;
      }

      .right-stack {
        display: grid;
        gap: 1rem;
      }

      .bottom-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(20rem, 34rem);
        gap: 1rem;
        align-items: start;
      }

      @media (max-width: 1200px) {
        .workspace,
        .bottom-grid {
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
  base = '';
  schema = '';
  modoVisualizacao: ModoVisualizacao = 'schema_completo';
  conexoes: SelectOption[] = [];
  bases: SelectOption[] = [];
  schemaOptions: SelectOption[] = [];
  schemasComparacao: SchemaResumo[] = [];
  tabelas: TabelaResumo[] = [];
  fullDiagram?: DiagramResponse;
  diagram?: DiagramResponse;
  detalhe?: TabelaDetalhe;
  dados?: DadosTabelaPreview;
  selectedNode?: DiagramNode;
  selectedTableId = '';
  nodes: any[] = [];
  edges: any[] = [];
  loadingConexoes = false;
  loadingBases = false;
  loadingSchemas = false;
  loadingTabelas = false;
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
    this.limparSelecao();
    this.carregarBases();
  }

  onModoOperacaoChange(modo: ModoOperacao): void {
    this.modoOperacao = modo;
    this.limparSelecao();
    if (this.idConexao) {
      this.carregarBases();
    }
  }

  onAmbienteChange(ambiente: AmbienteExplorador): void {
    this.ambiente = ambiente;
    this.limparSelecao();
    if (this.idConexao) {
      this.carregarBases();
    }
  }

  onBaseChange(base: string): void {
    this.base = base;
    this.schema = '';
    this.schemaOptions = [];
    this.schemasComparacao = [];
    this.limparConteudo();

    if (!base) {
      return;
    }

    if (this.modoOperacao === 'explorar') {
      this.carregarSchemasExploracao(base);
    } else {
      this.carregarSchemasComparacao(base);
    }
  }

  onSchemaChange(schema: string): void {
    this.schema = schema;
    this.limparConteudo();

    if (!this.base || !schema) {
      return;
    }

    if (this.modoOperacao === 'explorar') {
      this.carregarTabelasExploracao();
    } else {
      this.compararSchema();
    }
  }

  onModoVisualizacaoChange(modo: ModoVisualizacao): void {
    this.modoVisualizacao = modo;
    if (modo === 'tabela_focada' && this.selectedNode) {
      this.carregarGrafoTabela(this.selectedNode);
      return;
    }

    this.diagram = this.fullDiagram;
    this.remontarDiagrama();
  }

  compararSchema(): void {
    if (!this.idConexao || !this.base || !this.schema) {
      return;
    }

    this.loadingDiagram = true;
    this.detalhe = undefined;
    this.dados = undefined;
    this.selectedNode = undefined;
    this.selectedTableId = '';
    this.service
      .compararSchema(this.base, this.schema, this.idConexao)
      .pipe(finalize(() => this.finalizarLoading('diagram')))
      .subscribe({
        next: (res) => {
          this.fullDiagram = res;
          this.diagram = res;
          this.remontarDiagrama();
        },
        error: () => this.exibirErro('Nao foi possivel comparar o schema selecionado.'),
      });
  }

  selecionarTabelaDiagrama(node: DiagramNode): void {
    if (this.modoOperacao === 'comparar') {
      this.selecionarTabelaComparacao(node);
      return;
    }

    this.selecionarTabelaExploracao({
      id: node.id,
      schema: node.schema,
      nome: node.nome,
      status: node.status,
      totalColunas: node.totalColunas,
      totalFks: node.totalFks,
    });
  }

  selecionarTabelaExploracao(tabela: TabelaResumo): void {
    if (!this.idConexao || !this.base || !this.schema) {
      return;
    }

    this.selectedTableId = tabela.id;
    this.dados = undefined;
    this.loadingDetail = true;
    this.detalhe = undefined;
    this.service
      .detalharTabelaAmbiente(this.ambiente, this.base, this.schema, tabela.id, this.idConexao)
      .pipe(finalize(() => this.finalizarLoading('detail')))
      .subscribe({
        next: (res) => {
          this.detalhe = res;
          this.cd.markForCheck();
        },
        error: () => this.exibirErro('Nao foi possivel carregar o detalhe da tabela.'),
      });
  }

  carregarDadosTabela(): void {
    if (!this.detalhe || !this.idConexao || !this.base || !this.schema) {
      return;
    }

    this.loadingDados = true;
    this.service
      .listarDadosTabela(this.ambiente, this.base, this.schema, this.detalhe.id, 100, this.idConexao)
      .pipe(finalize(() => this.finalizarLoading('dados')))
      .subscribe({
        next: (res) => {
          this.dados = res;
          this.cd.markForCheck();
        },
        error: () => this.exibirErro('Nao foi possivel carregar os registros da tabela.'),
      });
  }

  ambienteLabel(): string {
    return this.ambiente === 'cloud' ? 'Cloud' : 'Local';
  }

  private carregarConexoes(): void {
    this.loadingConexoes = true;
    this.service
      .listarConexoes()
      .pipe(finalize(() => this.finalizarLoading('conexoes')))
      .subscribe({
        next: (res) => {
          this.conexoes = res;
          this.idConexao = res[0]?.value || '';
          if (this.idConexao) {
            this.carregarBases();
          }
        },
        error: () => this.exibirErro('Nao foi possivel carregar as conexoes.'),
      });
  }

  private carregarBases(): void {
    this.loadingBases = true;
    const request =
      this.modoOperacao === 'explorar'
        ? this.service.listarBasesAmbiente(this.ambiente, this.idConexao)
        : this.service.listarBasesAmbiente('cloud', this.idConexao);

    request.pipe(finalize(() => this.finalizarLoading('bases'))).subscribe({
      next: (res) => (this.bases = res),
      error: () => this.exibirErro('Nao foi possivel carregar as bases.'),
    });
  }

  private carregarSchemasExploracao(base: string): void {
    this.loadingSchemas = true;
    this.service
      .listarSchemasAmbiente(this.ambiente, base, this.idConexao)
      .pipe(finalize(() => this.finalizarLoading('schemas')))
      .subscribe({
        next: (res) => (this.schemaOptions = res),
        error: () => this.exibirErro('Nao foi possivel carregar os schemas.'),
      });
  }

  private carregarSchemasComparacao(base: string): void {
    this.loadingSchemas = true;
    this.service
      .compararSchemas(base, this.idConexao)
      .pipe(finalize(() => this.finalizarLoading('schemas')))
      .subscribe({
        next: (res) => {
          this.schemasComparacao = res;
          this.schemaOptions = res.map((schema) => ({
            label: schema.schema,
            value: schema.schema,
          }));
        },
        error: () => this.exibirErro('Nao foi possivel carregar os schemas comparados.'),
      });
  }

  private carregarTabelasExploracao(): void {
    this.loadingTabelas = true;
    this.service
      .listarTabelasAmbiente(this.ambiente, this.base, this.schema, this.idConexao)
      .pipe(finalize(() => this.finalizarLoading('tabelas')))
      .subscribe({
        next: (res) => {
          this.tabelas = res;
          this.montarDiagramaExploracao(res);
        },
        error: () => this.exibirErro('Nao foi possivel carregar as tabelas.'),
      });
  }

  private selecionarTabelaComparacao(node: DiagramNode): void {
    if (!this.idConexao || !this.base || !this.schema) {
      return;
    }

    this.selectedNode = node;
    this.selectedTableId = node.id;
    if (this.modoVisualizacao === 'tabela_focada') {
      this.carregarGrafoTabela(node);
    } else {
      this.remontarDiagrama();
    }

    this.loadingDetail = true;
    this.detalhe = undefined;
    this.service
      .detalharTabela(this.base, this.schema, node.id, this.idConexao)
      .pipe(finalize(() => this.finalizarLoading('detail')))
      .subscribe({
        next: (res) => {
          this.detalhe = res;
          this.cd.markForCheck();
        },
        error: () => this.exibirErro('Nao foi possivel carregar o detalhe da tabela.'),
      });
  }

  private carregarGrafoTabela(node: DiagramNode): void {
    this.loadingDiagram = true;
    this.service
      .grafoTabela(this.base, this.schema, node.id, this.idConexao)
      .pipe(finalize(() => this.finalizarLoading('diagram')))
      .subscribe({
        next: (res) => {
          this.diagram = res;
          this.remontarDiagrama();
        },
        error: () => this.exibirErro('Nao foi possivel focar a tabela no grafo.'),
      });
  }

  private montarDiagramaExploracao(tabelas: TabelaResumo[]): void {
    const diagram: DiagramResponse = {
      base: this.base,
      schema: this.schema,
      nodes: tabelas.map((tabela) => ({
        id: tabela.id,
        schema: tabela.schema || this.schema,
        nome: tabela.nome,
        status: tabela.status || 'igual',
        totalColunas: tabela.totalColunas || 0,
        totalDiferencas: 0,
        totalFks: tabela.totalFks || 0,
      })),
      edges: [],
      resumo: {
        totalTabelas: tabelas.length,
        tabelasIguais: tabelas.length,
        tabelasDiferentes: 0,
        ausentesDestino: 0,
        novasDestino: 0,
        colunasDiferentes: 0,
      },
    };
    this.fullDiagram = diagram;
    this.diagram = diagram;
    this.remontarDiagrama();
  }

  private remontarDiagrama(): void {
    if (!this.diagram) {
      this.nodes = [];
      this.edges = [];
      return;
    }

    const diagram = mapDiagramToVflow(this.diagram, this.modoVisualizacao, this.selectedNode?.id);
    this.nodes = diagram.nodes;
    this.edges = diagram.edges;
    this.cd.markForCheck();
  }

  private limparSelecao(): void {
    this.base = '';
    this.schema = '';
    this.bases = [];
    this.schemaOptions = [];
    this.schemasComparacao = [];
    this.limparConteudo();
  }

  private limparConteudo(): void {
    this.tabelas = [];
    this.fullDiagram = undefined;
    this.diagram = undefined;
    this.detalhe = undefined;
    this.dados = undefined;
    this.selectedNode = undefined;
    this.selectedTableId = '';
    this.nodes = [];
    this.edges = [];
  }

  private finalizarLoading(
    area: 'conexoes' | 'bases' | 'schemas' | 'tabelas' | 'diagram' | 'detail' | 'dados'
  ): void {
    if (area === 'conexoes') this.loadingConexoes = false;
    if (area === 'bases') this.loadingBases = false;
    if (area === 'schemas') this.loadingSchemas = false;
    if (area === 'tabelas') this.loadingTabelas = false;
    if (area === 'diagram') this.loadingDiagram = false;
    if (area === 'detail') this.loadingDetail = false;
    if (area === 'dados') this.loadingDados = false;
    this.cd.markForCheck();
  }

  private exibirErro(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Erro', detail });
  }
}
