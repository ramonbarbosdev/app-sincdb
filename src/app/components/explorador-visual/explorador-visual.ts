import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { createEdges, createNodes } from 'ngx-vflow';
import { BaseService } from '../../services/base.service';
import {
  ComparacaoTabela,
  ExploradorNodeData,
  ExploradorTabela,
  ExploradorVisualResponse,
} from '../../models/explorador-visual.model';
import { FlagOption } from '../../models/flag-option';
import { ConnectionSelectorHeaderComponent } from './connection-selector-header/connection-selector-header.component';
import { SidebarTreeComponent } from './sidebar-tree/sidebar-tree.component';
import { SchemaDiagramComponent } from './schema-diagram/schema-diagram.component';
import { TableDetailsPanelComponent } from './table-details-panel/table-details-panel.component';
import { DiffSummaryComponent } from './diff-summary/diff-summary.component';
import { SqlPreviewPanelComponent } from './sql-preview-panel/sql-preview-panel.component';

@Component({
  selector: 'app-explorador-visual',
  standalone: true,
  imports: [
    CommonModule,
    TagModule,
    ProgressSpinnerModule,
    ConnectionSelectorHeaderComponent,
    SidebarTreeComponent,
    SchemaDiagramComponent,
    TableDetailsPanelComponent,
    DiffSummaryComponent,
    SqlPreviewPanelComponent,
  ],
  templateUrl: './explorador-visual.html',
  styleUrl: './explorador-visual.scss',
})
export class ExploradorVisual {
  base = '';
  esquema = '';
  loading = false;
  loadingBases = false;
  loadingEsquemas = false;
  bases: FlagOption[] = [];
  esquemas: FlagOption[] = [];
  response?: ExploradorVisualResponse;
  selectedTable?: ExploradorTabela;
  selectedComparison?: ComparacaoTabela;
  nodes: any[] = [];
  edges: any[] = [];

  private baseService = inject(BaseService);
  private cd = inject(ChangeDetectorRef);

  ngOnInit() {
    this.carregarBases();
  }

  onBaseChange(base: string) {
    this.base = base;
    this.esquema = '';
    this.esquemas = [];
    this.limparResultado();

    if (base) {
      this.carregarEsquemas(base);
    }
  }

  onEsquemaChange(esquema: string) {
    this.esquema = esquema;
    this.limparResultado();
  }

  comparar() {
    if (!this.base || !this.esquema) {
      return;
    }

    this.loading = true;
    this.baseService.findAll(`explorador/${this.base}/${this.esquema}/comparar`).subscribe({
      next: (res: ExploradorVisualResponse) => {
        this.response = res;
        this.montarFluxo(res);
        this.loading = false;
        this.cd.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cd.markForCheck();
      },
    });
  }

  selecionarTabela(tabela: ExploradorTabela, comparacao?: ComparacaoTabela) {
    this.selectedTable = tabela;
    this.selectedComparison =
      comparacao ||
      this.response?.comparacao.tabelas.find((item) => item.nomeCompleto === tabela.nomeCompleto);
  }

  selecionarTabelaDiagrama(event: { tabela: ExploradorTabela; comparacao?: ComparacaoTabela }) {
    this.selecionarTabela(event.tabela, event.comparacao);
  }

  private carregarBases() {
    this.loadingBases = true;
    this.baseService.findAll('sincronizacao/bases/').subscribe({
      next: (res: any) => {
        this.bases = this.mapearOpcoes(res);
        this.loadingBases = false;
        this.cd.markForCheck();
      },
      error: () => {
        this.loadingBases = false;
        this.cd.markForCheck();
      },
    });
  }

  private carregarEsquemas(base: string) {
    this.loadingEsquemas = true;
    this.baseService.findAll(`sincronizacao/base/esquema/${base}`).subscribe({
      next: (res: any) => {
        this.esquemas = this.mapearOpcoes(res);
        this.esquema = this.esquemas.find((item) => item.code === 'public')?.code
          || String(this.esquemas[0]?.code || '');
        this.loadingEsquemas = false;
        this.cd.markForCheck();
      },
      error: () => {
        this.loadingEsquemas = false;
        this.cd.markForCheck();
      },
    });
  }

  private mapearOpcoes(res: any): FlagOption[] {
    const lista = Array.isArray(res) ? res : [];
    return lista.map((index: any) => {
      const item = new FlagOption();
      item.code = String(index);
      item.name = String(index);
      return item;
    });
  }

  private limparResultado() {
    this.response = undefined;
    this.selectedTable = undefined;
    this.selectedComparison = undefined;
    this.nodes = [];
    this.edges = [];
  }

  private montarFluxo(response: ExploradorVisualResponse) {
    const tabelas = (response.origem?.schemas || []).flatMap((schema) => schema.tabelas || []);
    const comparacoes = response.comparacao?.tabelas || [];

    this.nodes = createNodes(
      tabelas.map((tabela, index) => {
        const comparacao = comparacoes.find((item) => item.nomeCompleto === tabela.nomeCompleto);
        const column = index % 3;
        const row = Math.floor(index / 3);

        return {
          id: tabela.nomeCompleto,
          type: 'html-template',
          point: { x: 80 + column * 340, y: 80 + row * 270 },
          width: 280,
          height: 210,
          data: {
            label: tabela.nomeCompleto,
            tabela,
            comparacao,
          },
        };
      })
    );

    this.edges = createEdges(
      tabelas.flatMap((tabela) =>
        (tabela.foreignKeys || [])
          .filter((fk) => tabelas.some((item) => item.nomeCompleto === fk.tabelaReferencia))
          .map((fk) => ({
            id: `${tabela.nomeCompleto}-${fk.nome}`,
            source: tabela.nomeCompleto,
            target: fk.tabelaReferencia,
            curve: 'smooth-step',
            edgeLabels: {
              center: {
                type: 'html-template',
                data: fk.coluna,
              },
            },
          }))
      )
    );

    const first = tabelas[0];
    this.selecionarTabela(
      first,
      first ? comparacoes.find((item) => item.nomeCompleto === first.nomeCompleto) : undefined
    );
  }
}
