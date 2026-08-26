import { PointExtensions } from '@foblex/2d';
import {
  EFConnectionType,
  FCanvasComponent,
  FFlowModule,
  FZoomDirective,
  provideFFlow,
} from '@foblex/flow';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, Output, computed, inject, signal, viewChild } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import {
  SyncDiagramAction,
  SyncDiagramContext,
  SyncDiagramNodeData,
} from '../../models/sync-diagram.model';
import { SyncDiagramActionsService } from '../../services/sync-diagram-actions.service';
import { SyncDiagramCameraService } from '../../services/sync-diagram-camera.service';
import { SyncDiagramOperationService } from '../../services/sync-diagram-operation.service';
import { SyncDiagramQueueService } from '../../services/sync-diagram-queue.service';
import { SyncDiagramStateService } from '../../services/sync-diagram-state.service';
import { SyncDiagramThemeService } from '../../services/sync-diagram-theme.service';
import { SYNC_DIAGRAM_TOOLTIP } from '../../sync-diagram-chrome.constants';
import { SyncDiagramQueueListComponent } from '../sync-diagram-queue-list/sync-diagram-queue-list.component';
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
    TooltipModule,
    SyncDiagramNodeCardComponent,
    SyncOperationNodeCardComponent,
    SyncErdTableNodeComponent,
    SyncDiagramQueueListComponent,
  ],
  templateUrl: './sync-diagram-canvas.component.html',
  styleUrls: ['../../sync-diagram.theme.scss', './sync-diagram-canvas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncDiagramCanvasComponent {
  readonly tip = SYNC_DIAGRAM_TOOLTIP;
  readonly state = inject(SyncDiagramStateService);
  readonly themeService = inject(SyncDiagramThemeService);
  readonly queue = inject(SyncDiagramQueueService);
  private operations = inject(SyncDiagramOperationService);
  private actions = inject(SyncDiagramActionsService);
  private camera = inject(SyncDiagramCameraService);
  private canvas = viewChild(FCanvasComponent);
  private zoom = viewChild(FZoomDirective);

  @Input() running = false;
  @Input() syncDisabled = false;
  @Input() showSyncFab = false;
  @Input() scopeLabel = '';
  @Input() syncMode: 'estrutura' | 'dados' = 'estrutura';
  @Input() enqueueDisabled = false;
  @Input() canRunQueue = false;
  @Output() cancelar = new EventEmitter<void>();
  @Output() sincronizarSelecao = new EventEmitter<void>();
  @Output() adicionarFila = new EventEmitter<void>();
  @Output() runQueue = new EventEmitter<void>();
  @Output() removeFromQueue = new EventEmitter<string>();
  @Output() clearQueue = new EventEmitter<void>();

  readonly connectionType = EFConnectionType.SEGMENT;
  readonly zoomLevel = signal(100);
  readonly canvasDotGap = 22;
  readonly canvasDotColor = computed(() =>
    this.themeService.isDark()
      ? 'rgba(160, 166, 194, 0.14)'
      : 'rgba(72, 68, 96, 0.16)'
  );
  readonly blockFlowWheelZoom = (): boolean => false;

  onFlowReady(): void {
    const canvasRef = this.canvas();
    const zoomRef = this.zoom();
    if (!canvasRef) return;

    this.camera.registerCanvas(canvasRef);
    if (zoomRef) {
      this.camera.registerZoom(zoomRef);
    }
    canvasRef.fitToScreen(PointExtensions.initialize(64, 88), false);
    this.updateZoomLabel();
  }

  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent): void {
    if (this.state.loadingInitial()) return;
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.diagram-flow')) return;

    event.preventDefault();
    this.camera.zoomAtWheel(event);
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
    this.state.filterRevision();
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

  onDismissOperation(operationId: string): void {
    this.operations.dismissOperation(operationId);
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

  navigateBreadcrumb(item: { context: SyncDiagramContext }): void {
    this.state.navigateToBreadcrumb(item.context);
  }

  private updateZoomLabel(): void {
    const scale = this.camera.getScale();
    this.zoomLevel.set(Math.round(scale * 100));
  }
}
