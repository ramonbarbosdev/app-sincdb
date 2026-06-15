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

interface SqlDisplayError {
  title: string;
  message: string;
  rawMessage: string;
  position?: number;
  line?: number;
  column?: number;
  hint?: string;
}

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
  @Input() sql = '';

  columnDefs: ColDef[] = [];
  rowData: Record<string, unknown>[] = [];
  displayError?: SqlDisplayError;

  get shouldShowGrid(): boolean {
    return this.state !== 'executing' && !this.displayError && !!this.result?.columns.length;
  }

  get shouldShowErrorState(): boolean {
    return this.state !== 'executing' && !!this.displayError;
  }

  get shouldShowEmptyState(): boolean {
    return this.state !== 'executing' && !this.shouldShowErrorState && !this.shouldShowGrid;
  }

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
    this.displayError = this.buildDisplayError(this.errorMessage);
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

  private buildDisplayError(errorMessage: string): SqlDisplayError | undefined {
    const rawMessage = errorMessage.trim();
    if (!rawMessage || this.state !== 'error') return undefined;

    const position = this.extractErrorPosition(rawMessage);
    const location = position ? this.getSqlLocation(position) : undefined;
    const message = this.cleanSqlErrorMessage(rawMessage);

    return {
      title: this.getErrorTitle(rawMessage, message),
      message,
      rawMessage,
      position,
      line: location?.line,
      column: location?.column,
      hint: position
        ? 'Revise o trecho destacado pela posicao informada pelo banco de dados.'
        : 'Revise a sintaxe da consulta e os nomes de tabelas, colunas e aliases.',
    };
  }

  private cleanSqlErrorMessage(errorMessage: string): string {
    return errorMessage
      .replace(/^Erro JDBC ao executar consulta:\s*/i, '')
      .replace(/^ERROR:\s*/i, '')
      .replace(/\r?\n\s*Posi[cç][aã]o:\s*\d+\s*$/i, '')
      .trim();
  }

  private getErrorTitle(rawMessage: string, message: string): string {
    const normalized = `${rawMessage} ${message}`.toLowerCase();

    if (normalized.includes('syntax error')) return 'Erro de sintaxe SQL';
    if (normalized.includes('does not exist') || normalized.includes('nao existe')) return 'Objeto nao encontrado';
    if (normalized.includes('permission') || normalized.includes('permissao')) return 'Permissao insuficiente';
    if (normalized.includes('timeout')) return 'Tempo limite excedido';

    return 'Erro ao executar consulta';
  }

  private extractErrorPosition(errorMessage: string): number | undefined {
    const match = /Posi[cç][aã]o:\s*(\d+)/i.exec(errorMessage);
    const position = match?.[1] ? Number(match[1]) : 0;

    return Number.isFinite(position) && position > 0 ? position : undefined;
  }

  private getSqlLocation(position: number): { line: number; column: number } {
    const sqlBeforePosition = this.sql.slice(0, Math.max(position - 1, 0));
    const lines = sqlBeforePosition.split(/\r?\n/);

    return {
      line: lines.length,
      column: lines.at(-1)?.length ? lines.at(-1)!.length + 1 : 1,
    };
  }
}
