import { Injectable } from '@angular/core';
import { PointExtensions } from '@foblex/2d';
import { FCanvasComponent } from '@foblex/flow';

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 1.2;
const ZOOM_STEP = 0.1;
const AUTO_FOLLOW_PAUSE_MS = 12000;

@Injectable()
export class SyncDiagramCameraService {
  private canvas?: FCanvasComponent;
  private focusTimer?: ReturnType<typeof setTimeout>;
  private autoFollowPausedUntil = 0;

  registerCanvas(canvas: FCanvasComponent): void {
    this.canvas = canvas;
  }

  getScale(): number {
    return this.canvas?.getScale() ?? 1;
  }

  pauseAutoFollow(): void {
    this.autoFollowPausedUntil = Date.now() + AUTO_FOLLOW_PAUSE_MS;
  }

  focusNode(nodeId: string, animated?: boolean, force = false): void {
    if (!force && !this.canAutoFollow()) return;
    if (!this.canvas) return;
    const motion = animated ?? !this.prefersReducedMotion();
    requestAnimationFrame(() => {
      this.canvas?.resetScaleAndCenterGroupOrNode(nodeId, motion);
    });
  }

  focusImpactZone(operationId: string, animated?: boolean, force = false): void {
    this.focusNode(`erd-zone-${operationId}`, animated, force);
  }

  focusTable(tableNodeId: string, animated?: boolean, force = false): void {
    this.focusNode(tableNodeId, animated, force);
  }

  focusTableDebounced(tableNodeId: string): void {
    if (!this.canAutoFollow()) return;
    if (this.focusTimer) {
      clearTimeout(this.focusTimer);
    }
    this.focusTimer = setTimeout(() => {
      this.focusTable(tableNodeId);
      this.focusTimer = undefined;
    }, 300);
  }

  zoomIn(): void {
    this.pauseAutoFollow();
    if (!this.canvas) return;
    const next = Math.min(this.canvas.getScale() + ZOOM_STEP, MAX_ZOOM);
    this.canvas.setScale(next);
  }

  zoomOut(): void {
    this.pauseAutoFollow();
    if (!this.canvas) return;
    const next = Math.max(this.canvas.getScale() - ZOOM_STEP, MIN_ZOOM);
    this.canvas.setScale(next);
  }

  fitToScreen(animated = true): void {
    this.pauseAutoFollow();
    if (!this.canvas) return;
    this.canvas.fitToScreen(PointExtensions.initialize(80, 80), animated && !this.prefersReducedMotion());
  }

  private canAutoFollow(): boolean {
    return Date.now() >= this.autoFollowPausedUntil;
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    );
  }
}
