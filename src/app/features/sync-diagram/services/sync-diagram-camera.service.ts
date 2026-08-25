import { Injectable } from '@angular/core';
import { FCanvasComponent } from '@foblex/flow';

@Injectable()
export class SyncDiagramCameraService {
  private canvas?: FCanvasComponent;
  private focusTimer?: ReturnType<typeof setTimeout>;

  registerCanvas(canvas: FCanvasComponent): void {
    this.canvas = canvas;
  }

  focusNode(nodeId: string, animated?: boolean): void {
    if (!this.canvas) return;
    const motion = animated ?? !this.prefersReducedMotion();
    requestAnimationFrame(() => {
      this.canvas?.resetScaleAndCenterGroupOrNode(nodeId, motion);
    });
  }

  focusImpactZone(operationId: string, animated?: boolean): void {
    this.focusNode(`erd-zone-${operationId}`, animated);
  }

  focusTable(tableNodeId: string, animated?: boolean): void {
    this.focusNode(tableNodeId, animated);
  }

  focusTableDebounced(tableNodeId: string): void {
    if (this.focusTimer) {
      clearTimeout(this.focusTimer);
    }
    this.focusTimer = setTimeout(() => {
      this.focusTable(tableNodeId);
      this.focusTimer = undefined;
    }, 300);
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    );
  }
}
