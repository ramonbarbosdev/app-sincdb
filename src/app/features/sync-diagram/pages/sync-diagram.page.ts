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
import { SyncDiagramStateService } from '../services/sync-diagram-state.service';

@Component({
  selector: 'app-sync-diagram-page',
  standalone: true,
  providers: [
    SyncDiagramLayoutPersistenceService,
    SyncDiagramLayoutService,
    SyncDiagramCameraService,
    SyncDiagramStateService,
    SyncDiagramOperationService,
    SyncDiagramActionsService,
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
  private operations = inject(SyncDiagramOperationService);

  private previousMenuInactive = false;

  ngOnInit(): void {
    this.previousMenuInactive = this.layoutService.layoutState().staticMenuDesktopInactive ?? false;
    this.layoutService.layoutState.update((prev) => ({
      ...prev,
      staticMenuDesktopInactive: true,
    }));

    this.progressoSync.vazioProgressoLocal();
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
    if (sel.tabela) parts.push(sel.tabela);
    return parts;
  }

  selectionCount(): number {
    const sel = this.state.selection();
    return sel.tabela ? 1 : sel.esquema ? 1 : sel.base ? 1 : 0;
  }

  syncButtonLabel(): string {
    const count = this.selectionCount();
    return count > 0 ? `Sincronizar seleção (${count})` : 'Sincronizar seleção';
  }

  setMode(mode: SyncDiagramMode): void {
    this.state.setSyncMode(mode);
  }

  sincronizarSelecao(): void {
    const context = this.state.selection();
    this.actions.verificarESincronizar(context, this.state.syncMode());
  }

  hasRunningOperation(): boolean {
    return this.operations.hasRunningOperation();
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
    return !!(sel.base || sel.esquema || sel.tabela);
  }

  verificarEstrutura(): void {
    this.actions.verificarEstrutura(this.state.selection());
  }

  sincronizarEstrutura(): void {
    this.actions.sincronizarEstrutura(this.state.selection());
  }

  verificarDados(): void {
    this.actions.verificarDados(this.state.selection());
  }

  sincronizarDados(): void {
    this.actions.sincronizarDados(this.state.selection());
  }

  recolherNivel(): void {
    this.state.recolherNivel();
  }
}
