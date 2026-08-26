import { Injectable } from '@angular/core';
import { DiagramFlowPoint, ErdTableNode } from '../models/sync-diagram.model';

export interface LayoutNodeInput {
  id: string;
}

export interface LayoutBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutBoundsInput {
  id: string;
  position: DiagramFlowPoint;
  width: number;
  height: number;
}

const ZONE_PADDING = 48;
const ZONE_HEADER = 44;

/** Espaçamento padrão da grade ERD (colunas × linhas de tabelas). */
const ERD_COL_WIDTH = 360;
const ERD_ROW_HEIGHT = 260;
const ERD_GRID_COLUMNS = 3;

@Injectable()
export class SyncDiagramLayoutService {
  readonly tableWidth = 200;
  readonly tableHeaderHeight = 32;
  readonly tableRowHeight = 22;

  layoutErd(
    nodes: LayoutNodeInput[],
    origin: DiagramFlowPoint,
    columns = ERD_GRID_COLUMNS
  ): Map<string, DiagramFlowPoint> {
    const positions = new Map<string, DiagramFlowPoint>();
    const colWidth = ERD_COL_WIDTH;
    const rowHeight = ERD_ROW_HEIGHT;

    nodes.forEach((node, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      positions.set(node.id, {
        x: origin.x + col * colWidth,
        y: origin.y + row * rowHeight,
      });
    });

    return positions;
  }

  estimateTableHeight(table: ErdTableNode): number {
    if (table.mode === 'dados' && table.columns.length) {
      const rows = Math.min(table.columns.length, 10);
      return this.tableHeaderHeight + rows * this.tableRowHeight + 12;
    }
    return this.tableHeaderHeight + 12;
  }

  computeImpactBounds(
    items: LayoutBoundsInput[],
    padding = ZONE_PADDING,
    headerHeight = ZONE_HEADER
  ): LayoutBounds | null {
    if (!items.length) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const item of items) {
      minX = Math.min(minX, item.position.x);
      minY = Math.min(minY, item.position.y);
      maxX = Math.max(maxX, item.position.x + item.width);
      maxY = Math.max(maxY, item.position.y + item.height);
    }

    return {
      x: minX - padding,
      y: minY - padding - headerHeight,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2 + headerHeight,
    };
  }
}
