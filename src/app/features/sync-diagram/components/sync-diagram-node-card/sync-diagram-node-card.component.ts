import { FFlowModule } from '@foblex/flow';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  SyncDiagramAction,
  SyncDiagramItem,
  SyncDiagramKind,
  SyncDiagramNodeData,
} from '../../models/sync-diagram.model';

@Component({
  selector: 'app-sync-diagram-node-card',
  standalone: true,
  imports: [CommonModule, FormsModule, FFlowModule],
  templateUrl: './sync-diagram-node-card.component.html',
  styleUrls: ['../../sync-diagram.theme.scss', './sync-diagram-node-card.component.scss'],
})
export class SyncDiagramNodeCardComponent {
  @Input({ required: true }) node!: SyncDiagramNodeData;
  @Input() items: SyncDiagramItem[] = [];

  @Output() filterChange = new EventEmitter<string>();
  @Output() itemClick = new EventEmitter<string>();
  @Output() action = new EventEmitter<SyncDiagramAction>();

  iconLabel(kind: SyncDiagramKind): string {
    const map: Record<SyncDiagramKind, string> = {
      bases: 'B',
      schemas: 'S',
      tables: 'T',
    };
    return map[kind];
  }

  canCloseChildren(): boolean {
    return this.node.kind !== 'tables' && !!this.node.selectedItemId;
  }
}
