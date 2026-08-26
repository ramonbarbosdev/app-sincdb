import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ProgressoSyncService } from '../../../services/progresso-sync-service';
import { LayoutService } from '../../../layout/service/layout.service';
import { SyncDiagramCanvasComponent } from '../components/sync-diagram-canvas/sync-diagram-canvas.component';
import { SyncDiagramActionsPanelComponent } from '../components/sync-diagram-actions-panel/sync-diagram-actions-panel.component';
import { SyncDiagramMode } from '../models/sync-diagram.model';
import { SyncDiagramActionsService } from '../services/sync-diagram-actions.service';
import { SyncDiagramCameraService } from '../services/sync-diagram-camera.service';
import { SyncDiagramLayoutPersistenceService } from '../services/sync-diagram-layout-persistence.service';
import { SyncDiagramLayoutService } from '../services/sync-diagram-layout.service';
import { SyncDiagramOperationService } from '../services/sync-diagram-operation.service';
import { SyncDiagramQueueService } from '../services/sync-diagram-queue.service';
import { SyncDiagramStateService } from '../services/sync-diagram-state.service';
import { SyncDiagramThemeService } from '../services/sync-diagram-theme.service';

@Component({
  selector: 'app-sync-diagram-page',
  standalone: true,
  providers: [
    SyncDiagramLayoutPersistenceService,
    SyncDiagramLayoutService,
    SyncDiagramCameraService,
    SyncDiagramThemeService,
    SyncDiagramStateService,
    SyncDiagramOperationService,
    SyncDiagramActionsService,
    SyncDiagramQueueService,
  ],
  imports: [CommonModule, SyncDiagramCanvasComponent, SyncDiagramActionsPanelComponent],
  templateUrl: './sync-diagram.page.html',
  styleUrls: ['../sync-diagram.theme.scss', './sync-diagram.page.scss'],
})
export class SyncDiagramPage implements OnInit, OnDestroy {
  private layoutService = inject(LayoutService);
  private progressoSync = inject(ProgressoSyncService);
  private actions = inject(SyncDiagramActionsService);
  readonly state = inject(SyncDiagramStateService);
  readonly theme = inject(SyncDiagramThemeService);
  readonly queue = inject(SyncDiagramQueueService);
  private operations = inject(SyncDiagramOperationService);

  private previousMenuInactive = false;

  ngOnInit(): void {
    this.previousMenuInactive = this.layoutService.layoutState().staticMenuDesktopInactive ?? false;
    this.layoutService.layoutState.update((prev) => ({
      ...prev,
      staticMenuDesktopInactive: true,
    }));

    this.progressoSync.vazioProgressoLocal();
    this.actions.loadConexaoPadrao();
    this.actions.loadQueueState();
    this.state.init();
  }

  ngOnDestroy(): void {
    this.state.flushPersist();
    this.layoutService.layoutState.update((prev) => ({
      ...prev,
      staticMenuDesktopInactive: this.previousMenuInactive,
    }));
    this.progressoSync.vazioProgressoLocal();
  }

  breadcrumbParts(): string[] {
    const sel = this.state.selection();
    const parts: string[] = [];
    if (sel.base) parts.push(sel.base);
    if (sel.esquema) parts.push(sel.esquema);
    const tabelas = this.state.selectedTabelas(sel);
    if (tabelas.length === 1) {
      parts.push(tabelas[0]);
    } else if (tabelas.length > 1) {
      parts.push(`${tabelas.length} tabelas`);
    }
    return parts;
  }

  hasSyncableSelection(): boolean {
    const sel = this.state.selection();
    return !!sel.esquema;
  }

  setMode(mode: SyncDiagramMode): void {
    this.state.setSyncMode(mode);
  }

  sincronizarSelecao(): void {
    const context = this.state.selection();
    this.actions.syncNow(context, this.state.syncMode());
  }

  adicionarFila(): void {
    const context = this.state.selection();
    this.actions.addToQueue(context, this.state.syncMode());
  }

  executarFila(): void {
    this.actions.runQueue();
  }

  removerDaFila(id: string): void {
    this.actions.removeFromQueue(id);
  }

  limparFila(): void {
    this.actions.clearQueue();
  }

  hasRunningOperation(): boolean {
    return this.operations.hasRunningOperation();
  }

  isEnqueueDisabled(): boolean {
    return !this.actions.canEnqueue(this.state.selection(), this.state.syncMode());
  }

  canRunQueue(): boolean {
    return (
      this.queue.count() > 0 &&
      !this.hasRunningOperation() &&
      !this.queue.runnerActive() &&
      !this.actions.isBatchActive()
    );
  }

  isSyncDisabled(): boolean {
    return (
      !this.actions.hasConexaoPadrao() ||
      this.hasRunningOperation() ||
      this.actions.isBatchActive()
    );
  }

  cancelarOperacao(): void {
    this.operations.cancelActiveOperation();
  }

  scopeLabel(): string {
    const parts = this.breadcrumbParts();
    return parts.length ? parts.join(' › ') : 'Selecione base, schema ou tabela';
  }

  canRecolher(): boolean {
    const sel = this.state.selection();
    return !!(sel.base || sel.esquema || this.state.selectedTabelas(sel).length > 0);
  }

  recolherNivel(): void {
    this.state.recolherNivel();
  }

  organizarCanvas(): void {
    this.state.autoLayoutCanvas();
  }
}
