import { Injectable, inject, signal } from '@angular/core';
import { IPoint, PointExtensions } from '@foblex/2d';
import {
  FCanvasComponent,
  FFlowComponent,
  FZoomDirective,
} from '@foblex/flow';
import { SyncDiagramCameraService } from './sync-diagram-camera.service';

export interface SyncDiagramFlowRefs {
  flow: FFlowComponent;
  canvas: FCanvasComponent;
  zoom: FZoomDirective;
}

@Injectable()
export class SyncDiagramFlowController {
  private readonly camera = inject(SyncDiagramCameraService);
  private readonly flow = signal<FFlowComponent | null>(null);
  private readonly canvas = signal<FCanvasComponent | null>(null);
  private readonly zoom = signal<FZoomDirective | null>(null);

  register(refs: SyncDiagramFlowRefs): void {
    this.flow.set(refs.flow);
    this.canvas.set(refs.canvas);
    this.zoom.set(refs.zoom);
    this.camera.registerCanvas(refs.canvas);
    this.camera.registerZoom(refs.zoom);
  }

  initializeViewport(): void {
    this.canvas()?.fitToScreen(PointExtensions.initialize(64, 88), false);
  }

  setCanvasScale(scale: number): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.style.setProperty('--flow-scale', `${scale}`);
  }

  getScale(): number {
    return this.camera.getScale();
  }

  pauseAutoFollow(): void {
    this.camera.pauseAutoFollow();
  }

  zoomIn(): void {
    this.camera.zoomIn();
  }

  zoomOut(): void {
    this.camera.zoomOut();
  }

  fitToScreen(): void {
    this.camera.fitToScreen();
  }

  resetScaleAndCenter(): void {
    this.camera.resetScaleAndCenter();
  }

  zoomAtWheel(event: WheelEvent): void {
    this.camera.zoomAtWheel(event);
  }

  focusNode(nodeId: string, animated?: boolean, force = false): void {
    this.camera.focusNode(nodeId, animated, force);
  }

  getFlowPosition(position: IPoint): IPoint {
    const flow = this.flow();
    if (!flow) {
      return position;
    }
    return flow.getPositionInFlow(position);
  }
}