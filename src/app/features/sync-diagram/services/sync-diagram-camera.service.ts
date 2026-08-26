import { Injectable } from '@angular/core';
import { PointExtensions } from '@foblex/2d';
import { FCanvasComponent, FZoomDirective } from '@foblex/flow';

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 1.2;
const ZOOM_STEP = 0.1;
const AUTO_FOLLOW_PAUSE_MS = 12000;
const FIT_PADDING_X = 64;
const FIT_PADDING_Y = 88;

@Injectable()
export class SyncDiagramCameraService {
  private canvas?: FCanvasComponent;
  private zoom?: FZoomDirective;
  private focusTimer?: ReturnType<typeof setTimeout>;
  private autoFollowPausedUntil = 0;

  registerCanvas(canvas: FCanvasComponent): void {
    this.canvas = canvas;
  }

  registerZoom(zoom: FZoomDirective): void {
    this.zoom = zoom;
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
    if (this.zoom) {
      this.zoom.zoomIn();
      return;
    }
    if (!this.canvas) return;
    const next = Math.min(this.canvas.getScale() + ZOOM_STEP, MAX_ZOOM);
    this.canvas.setScale(next);
  }

  zoomOut(): void {
    this.pauseAutoFollow();
    if (this.zoom) {
      this.zoom.zoomOut();
      return;
    }
    if (!this.canvas) return;
    const next = Math.max(this.canvas.getScale() - ZOOM_STEP, MIN_ZOOM);
    this.canvas.setScale(next);
  }

  zoomAtWheel(event: WheelEvent): void {
    if (!event.deltaY) return;
    this.pauseAutoFollow();
    const position = PointExtensions.initialize(event.clientX, event.clientY);
    if (event.deltaY < 0) {
      if (this.zoom) {
        this.zoom.zoomIn(position);
      } else {
        this.zoomIn();
      }
      return;
    }
    if (this.zoom) {
      this.zoom.zoomOut(position);
    } else {
      this.zoomOut();
    }
  }

  fitToScreen(animated = true): void {
    this.pauseAutoFollow();
    if (!this.canvas) return;
    this.canvas.fitToScreen(
      PointExtensions.initialize(FIT_PADDING_X, FIT_PADDING_Y),
      animated && !this.prefersReducedMotion()
    );
  }

  resetScaleAndCenter(animated = true): void {
    this.pauseAutoFollow();
    if (!this.canvas) return;
    this.canvas.resetScaleAndCenter(animated && !this.prefersReducedMotion());
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
