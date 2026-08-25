import { PointExtensions } from '@foblex/2d';
import {
  EFConnectionType,
  FCanvasComponent,
  FFlowModule,
  provideFFlow,
} from '@foblex/flow';
import { CommonModule } from '@angular/common';
import { Component, inject, signal, viewChild } from '@angular/core';
import {
  SyncDiagramAction,
  SyncDiagramNodeData,
} from '../../models/sync-diagram.model';
import { SyncDiagramActionsService } from '../../services/sync-diagram-actions.service';
import { SyncDiagramCameraService } from '../../services/sync-diagram-camera.service';
import { SyncDiagramOperationService } from '../../services/sync-diagram-operation.service';
import { SyncDiagramStateService } from '../../services/sync-diagram-state.service';
import { SyncDiagramNodeCardComponent } from '../sync-diagram-node-card/sync-diagram-node-card.component';
import { SyncErdImpactZoneComponent } from '../sync-erd-impact-zone/sync-erd-impact-zone.component';
import { SyncErdTableNodeComponent } from '../sync-erd-table-node/sync-erd-table-node.component';
import { SyncOperationNodeCardComponent } from '../sync-operation-node-card/sync-operation-node-card.component';

@Component({
  selector: 'app-sync-diagram-canvas',
  standalone: true,
  providers: [provideFFlow()],
  imports: [
    CommonModule,
    FFlowModule,
    SyncDiagramNodeCardComponent,
    SyncOperationNodeCardComponent,
    SyncErdTableNodeComponent,
    SyncErdImpactZoneComponent,
  ],
  templateUrl: './sync-diagram-canvas.component.html',
  styleUrls: ['../../sync-diagram.theme.scss', './sync-diagram-canvas.component.scss'],
})
export class SyncDiagramCanvasComponent {
  readonly state = inject(SyncDiagramStateService);
  private actions = inject(SyncDiagramActionsService);
  private operations = inject(SyncDiagramOperationService);
  private camera = inject(SyncDiagramCameraService);
  private canvas = viewChild(FCanvasComponent);

  readonly connectionType = EFConnectionType.SEGMENT;
  readonly zoomLevel = signal(100);

  onFlowReady(): void {
    const canvasRef = this.canvas();
    if (canvasRef) {
      this.camera.registerCanvas(canvasRef);
      canvasRef.fitToScreen(PointExtensions.initialize(80, 80), false);
      this.updateZoomLabel();
    }
  }

  onCanvasChange(): void {
    this.updateZoomLabel();
  }

  onUserCanvasInteraction(): void {
    this.camera.pauseAutoFollow();
  }

  zoomIn(): void {
    this.camera.zoomIn();
    this.updateZoomLabel();
  }

  zoomOut(): void {
    this.camera.zoomOut();
    this.updateZoomLabel();
  }

  fitView(): void {
    this.camera.fitToScreen();
    this.updateZoomLabel();
  }

  onPositionChange(nodeId: string, position: { x: number; y: number }): void {
    this.camera.pauseAutoFollow();
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

  onToggleOperationDetail(operationId: string): void {
    this.operations.toggleDetail(operationId);
  }

  onCloseOperationDetail(operationId: string): void {
    this.operations.closeDetail(operationId);
  }

  onCancelOperation(operationId: string): void {
    this.operations.cancelOperation(operationId);
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

  private updateZoomLabel(): void {
    this.zoomLevel.set(Math.round(this.camera.getScale() * 100));
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
