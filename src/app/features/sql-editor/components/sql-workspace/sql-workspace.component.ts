import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  DangerousSqlCheck,
  SqlCatalogResponse,
  SqlCatalogTableSelection,
  SqlEditorState,
  SqlExecutionResponse,
  SqlHistoryItem,
  SqlQueryTab,
} from '../../models/sql-editor.model';
import { SqlEditorPaneComponent } from '../sql-editor-pane/sql-editor-pane.component';
import { SqlResultsWorkspaceComponent } from '../sql-results-workspace/sql-results-workspace.component';

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
  selector: 'app-sql-workspace',
  standalone: true,
  imports: [
    CommonModule,
    SqlEditorPaneComponent,
    SqlResultsWorkspaceComponent,
  ],
  templateUrl: './sql-workspace.component.html',
  styleUrl: './sql-workspace.component.scss',
})
export class SqlWorkspaceComponent {
  @Input() sql = '';
  @Input() state: SqlEditorState = 'initial';
  @Input() danger: DangerousSqlCheck = { dangerous: false, reason: '' };
  @Input() catalogo?: SqlCatalogResponse;
  @Input() result?: SqlExecutionResponse;
  @Input() errorMessage = '';
  @Input() resultInsights: SqlInsight[] = [];
  @Input() queryWarnings: string[] = [];
  @Input() columnStatistics: SqlColumnStatistic[] = [];
  @Input() history: SqlHistoryItem[] = [];
  @Input() workspaceGridTemplate = 'minmax(0, 78fr) 12px minmax(0, 22fr)';
  @Input() queryTabs: SqlQueryTab[] = [];
  @Input() activeQueryTabId = '';

  @Output() sqlChange = new EventEmitter<string>();
  @Output() formatar = new EventEmitter<void>();
  @Output() executar = new EventEmitter<void>();
  @Output() executarSelecionado = new EventEmitter<string>();
  @Output() limpar = new EventEmitter<void>();
  @Output() salvar = new EventEmitter<void>();
  @Output() historico = new EventEmitter<void>();
  @Output() novaConsulta = new EventEmitter<void>();
  @Output() selecionarQueryTab = new EventEmitter<string>();
  @Output() fecharQueryTab = new EventEmitter<string>();
  @Output() maximizarEditor = new EventEmitter<void>();
  @Output() maximizarResultados = new EventEmitter<void>();
  @Output() restaurarLayout = new EventEmitter<void>();
  @Output() resizeStart = new EventEmitter<PointerEvent>();
  @Output() propriedadesTabela = new EventEmitter<SqlCatalogTableSelection>();
  @Output() selecionarHistorico = new EventEmitter<SqlHistoryItem>();
  @Output() fecharResultados = new EventEmitter<void>();
}
