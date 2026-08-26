import { PointExtensions } from '@foblex/2d';
import {
  EFConnectionType,
  FCanvasComponent,
  FFlowModule,
  FZoomDirective,
  provideFFlow,
} from '@foblex/flow';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import {
  SyncDiagramAction,
  SyncDiagramNodeData,
} from '../../models/sync-diagram.model';
import { SyncDiagramActionsService } from '../../services/sync-diagram-actions.service';
import { SyncDiagramCameraService } from '../../services/sync-diagram-camera.service';
import { SyncDiagramOperationService } from '../../services/sync-diagram-operation.service';
import { SyncDiagramStateService } from '../../services/sync-diagram-state.service';
import { SyncDiagramNodeCardComponent } from '../sync-diagram-node-card/sync-diagram-node-card.component';
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
  ],
  templateUrl: './sync-diagram-canvas.component.html',
  styleUrls: ['../../sync-diagram.theme.scss', './sync-diagram-canvas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncDiagramCanvasComponent {
  readonly state = inject(SyncDiagramStateService);
  private operations = inject(SyncDiagramOperationService);
  private actions = inject(SyncDiagramActionsService);
  private camera = inject(SyncDiagramCameraService);
  private canvas = viewChild(FCanvasComponent);
  private zoom = viewChild(FZoomDirective);

  readonly connectionType = EFConnectionType.SEGMENT;
  readonly zoomLevel = signal(100);

  onFlowReady(): void {
    const canvasRef = this.canvas();
    const zoomRef = this.zoom();
    if (!canvasRef) return;

    this.camera.registerCanvas(canvasRef);
    if (zoomRef) {
      this.camera.registerZoom(zoomRef);
    }
    canvasRef.fitToScreen(PointExtensions.initialize(80, 80), false);
    this.updateZoomLabel();
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

  resetView(): void {
    this.camera.resetScaleAndCenter();
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

  onRetryOperation(operationId: string): void {
    const op = this.state.getOperation(operationId);
    if (op) {
      this.actions.retryOperation(op);
    }
  }

  onToggleOperationErrors(operationId: string): void {
    this.state.toggleOperationErrorsExpanded(operationId);
  }

  onNodeAction(action: SyncDiagramAction, node: SyncDiagramNodeData): void {
    if (action === 'close-children') {
      this.state.closeChildren(node.kind);
    }
  }

  private updateZoomLabel(): void {
    this.zoomLevel.set(Math.round(this.camera.getScale() * 100));
  }
}
