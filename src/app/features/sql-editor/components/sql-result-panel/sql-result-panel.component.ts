import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { SqlEditorState, SqlExecutionResponse, SqlResultColumn } from '../../models/sql-editor.model';

@Component({
  selector: 'app-sql-result-panel',
  standalone: true,
  imports: [CommonModule, ProgressSpinnerModule, TableModule, TabsModule],
  templateUrl: './sql-result-panel.component.html',
  styleUrl: './sql-result-panel.component.scss',
})
export class SqlResultPanelComponent {
  @Input() result?: SqlExecutionResponse;
  @Input() state: SqlEditorState = 'initial';
  @Input() errorMessage = '';

  cellValue(row: Record<string, unknown>, column: SqlResultColumn): string {
    const value = row[column.name];
    return value === null || value === undefined ? '' : String(value);
  }

  columnLabel(column: SqlResultColumn): string {
    return column.type ? `${column.name} (${column.type})` : column.name;
  }
}
