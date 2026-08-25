import { Injectable } from '@angular/core';
import { DiagramFlowPoint } from '../models/sync-diagram.model';

export interface LayoutNodeInput {
  id: string;
}

export interface LayoutEdgeInput {
  source: string;
  target: string;
}

@Injectable()
export class SyncDiagramLayoutService {
  layoutErd(
    nodes: LayoutNodeInput[],
    origin: DiagramFlowPoint,
    columns = 3
  ): Map<string, DiagramFlowPoint> {
    const positions = new Map<string, DiagramFlowPoint>();
    const colWidth = 300;
    const rowHeight = 200;

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
}
