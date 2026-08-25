import { PointExtensions } from '@foblex/2d';
import {
  EFConnectionType,
  FCanvasComponent,
  FFlowModule,
  F_SCROLL_PAN_CONTROL_SCHEME,
  provideFFlow,
  withControlScheme,
} from '@foblex/flow';
import { CommonModule } from '@angular/common';
import { Component, inject, viewChild } from '@angular/core';
import {
  SyncDiagramAction,
  SyncDiagramKind,
  SyncDiagramNodeData,
} from '../../models/sync-diagram.model';
import { SyncDiagramActionsService } from '../../services/sync-diagram-actions.service';
import { SyncDiagramStateService } from '../../services/sync-diagram-state.service';
import { SyncDiagramNodeCardComponent } from '../sync-diagram-node-card/sync-diagram-node-card.component';

@Component({
  selector: 'app-sync-diagram-canvas',
  standalone: true,
  providers: [provideFFlow(withControlScheme(F_SCROLL_PAN_CONTROL_SCHEME))],
  imports: [CommonModule, FFlowModule, SyncDiagramNodeCardComponent],
  templateUrl: './sync-diagram-canvas.component.html',
  styleUrls: ['../../sync-diagram.theme.scss', './sync-diagram-canvas.component.scss'],
})
export class SyncDiagramCanvasComponent {
  readonly state = inject(SyncDiagramStateService);
  private actions = inject(SyncDiagramActionsService);
  private canvas = viewChild(FCanvasComponent);

  readonly connectionType = EFConnectionType.SEGMENT;

  onFlowReady(): void {
    this.canvas()?.fitToScreen(PointExtensions.initialize(80, 80), false);
  }

  onPositionChange(nodeId: string, position: { x: number; y: number }): void {
    this.state.updateNodePosition(nodeId, position);
  }

  filteredItems(nodeId: string) {
    return this.state.filteredItems(nodeId);
  }

  onFilterChange(nodeId: string, value: string): void {
    this.state.setFilter(nodeId, value);
  }

  onItemClick(node: SyncDiagramNodeData, itemId: string): void {
    this.state.selectItem(node.kind, itemId, node.context);
  }

  onAction(action: SyncDiagramAction, node: SyncDiagramNodeData): void {
    if (action === 'close-children') {
      this.state.closeChildren(node.kind);
      return;
    }

    const context = this.buildActionContext(node);

    switch (action) {
      case 'verify-estrutura':
        this.actions.verificarEstrutura(context);
        break;
      case 'sync-estrutura':
        this.actions.sincronizarEstrutura(context);
        break;
      case 'verify-dados':
        this.actions.verificarDados(context);
        break;
      case 'sync-dados':
        this.actions.sincronizarDados(context);
        break;
    }
  }

  isEstruturaMode(): boolean {
    return this.state.syncMode() === 'estrutura';
  }

  isDadosMode(): boolean {
    return this.state.syncMode() === 'dados';
  }

  private buildActionContext(node: SyncDiagramNodeData) {
    const sel = this.state.selection();
    if (node.kind === 'tables') {
      return {
        base: node.context.base ?? sel.base,
        esquema: node.context.esquema ?? sel.esquema,
        tabela: sel.tabela,
      };
    }
    if (node.kind === 'schemas') {
      return {
        base: node.context.base ?? sel.base,
        esquema: sel.esquema,
      };
    }
    return { ...sel };
  }
}
