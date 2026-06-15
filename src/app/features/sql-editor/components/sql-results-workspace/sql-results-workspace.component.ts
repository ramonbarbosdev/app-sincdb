import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import {
  SqlEditorState,
  SqlExecutionResponse,
  SqlHistoryItem,
} from '../../models/sql-editor.model';
import { SqlHistoryPanelComponent } from '../sql-history-panel/sql-history-panel.component';
import { SqlResultPanelComponent } from '../sql-result-panel/sql-result-panel.component';
import { SqlResultsContextbarComponent } from '../sql-results-contextbar/sql-results-contextbar.component';

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
  selector: 'app-sql-results-workspace',
  standalone: true,
  imports: [
    CommonModule,
    TabsModule,
    SqlResultPanelComponent,
    SqlHistoryPanelComponent,
    SqlResultsContextbarComponent,
  ],
  templateUrl: './sql-results-workspace.component.html',
  styleUrl: './sql-results-workspace.component.scss',
})
export class SqlResultsWorkspaceComponent {
  @Input() state: SqlEditorState = 'initial';
  @Input() result?: SqlExecutionResponse;
  @Input() errorMessage = '';
  @Input() sql = '';
  @Input() resultInsights: SqlInsight[] = [];
  @Input() queryWarnings: string[] = [];
  @Input() columnStatistics: SqlColumnStatistic[] = [];
  @Input() history: SqlHistoryItem[] = [];

  @Output() maximizarResultados = new EventEmitter<void>();
  @Output() restaurarLayout = new EventEmitter<void>();
  @Output() selecionarHistorico = new EventEmitter<SqlHistoryItem>();
  @Output() fechar = new EventEmitter<void>();
}