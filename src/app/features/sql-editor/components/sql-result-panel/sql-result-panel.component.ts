import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridOptions,
  ModuleRegistry,
  AllCommunityModule,
} from 'ag-grid-community';

import {
  SqlEditorState,
  SqlExecutionResponse,
  SqlResultColumn,
} from '../../models/sql-editor.model';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-sql-result-panel',
  standalone: true,
  imports: [CommonModule, ProgressSpinnerModule, AgGridAngular],
  templateUrl: './sql-result-panel.component.html',
  styleUrl: './sql-result-panel.component.scss',
})
export class SqlResultPanelComponent implements OnChanges {
  @Input() result?: SqlExecutionResponse;
  @Input() state: SqlEditorState = 'initial';
  @Input() errorMessage = '';

  columnDefs: ColDef[] = [];
  rowData: Record<string, unknown>[] = [];

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    minWidth: 120,
    flex: 1,
  };

  gridOptions: GridOptions = {
    animateRows: false,
    rowSelection: 'multiple',
    suppressCellFocus: false,
    enableCellTextSelection: true,
    ensureDomOrder: true,
    pagination: true,
    paginationPageSize: 100,
    paginationPageSizeSelector: [50, 100, 250, 500],
  };

  ngOnChanges(): void {
    this.columnDefs = this.buildColumnDefs(this.result?.columns || []);
    this.rowData = this.result?.rows || [];
  }

  private buildColumnDefs(columns: SqlResultColumn[]): ColDef[] {
    return columns.map((column) => ({
      field: column.name,
      headerName: column.name,
      headerTooltip: column.type ? `${column.name} (${column.type})` : column.name,
      tooltipField: column.name,
      valueFormatter: (params) => this.formatValue(params.value),
    }));
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined) return '';

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }
}