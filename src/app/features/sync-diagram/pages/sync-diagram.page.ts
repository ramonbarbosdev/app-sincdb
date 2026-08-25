import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CloudLocalPulse } from '../../../components/cloud-local-pulse/cloud-local-pulse';
import { Conexao } from '../../../models/conexao';
import { BaseService } from '../../../services/base.service';
import { ProgressoSyncService } from '../../../services/progresso-sync-service';
import { LayoutService } from '../../../layout/service/layout.service';
import { SyncDiagramCanvasComponent } from '../components/sync-diagram-canvas/sync-diagram-canvas.component';
import { SyncDiagramMode } from '../models/sync-diagram.model';
import { SyncDiagramActionsService } from '../services/sync-diagram-actions.service';
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
    SyncDiagramStateService,
    SyncDiagramOperationService,
    SyncDiagramActionsService,
  ],
  imports: [CommonModule, CloudLocalPulse, SyncDiagramCanvasComponent],
  templateUrl: './sync-diagram.page.html',
  styleUrls: ['../sync-diagram.theme.scss', './sync-diagram.page.scss'],
})
export class SyncDiagramPage implements OnInit, OnDestroy {
  private layoutService = inject(LayoutService);
  private baseService = inject(BaseService);
  private progressoSync = inject(ProgressoSyncService);
  private actions = inject(SyncDiagramActionsService);
  readonly state = inject(SyncDiagramStateService);
  private operations = inject(SyncDiagramOperationService);
  private router = inject(Router);

  conexaoPadrao?: Conexao;
  loadingConexao = true;
  private previousMenuInactive = false;

  ngOnInit(): void {
    this.previousMenuInactive = this.layoutService.layoutState().staticMenuDesktopInactive ?? false;
    this.layoutService.layoutState.update((prev) => ({
      ...prev,
      staticMenuDesktopInactive: true,
    }));

    this.progressoSync.vazioProgressoLocal();
    this.obterConexaoPadrao();
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

  isMode(mode: SyncDiagramMode): boolean {
    return this.state.syncMode() === mode;
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

  irParaConexao(): void {
    this.router.navigate(['/client/conexao']);
  }

  private obterConexaoPadrao(): void {
    this.loadingConexao = true;
    this.baseService.findAll('conexao').subscribe({
      next: (res: unknown) => {
        const lista = Array.isArray(res)
          ? res
          : (res as { conexoes?: Conexao[]; items?: Conexao[]; content?: Conexao[] })?.conexoes ||
            (res as { items?: Conexao[] })?.items ||
            (res as { content?: Conexao[] })?.content ||
            [];
        this.conexaoPadrao = this.normalizarConexaoPadrao(
          lista.find((item) => item.fl_padrao) || lista[0]
        );
        this.loadingConexao = false;
      },
      error: () => {
        this.loadingConexao = false;
      },
    });
  }

  private normalizarConexaoPadrao(conexao?: Conexao): Conexao | undefined {
    if (!conexao) return undefined;
    return {
      ...conexao,
      db_cloud_host: conexao.db_cloud_host ?? '',
      db_local_host: conexao.db_local_host ?? '',
    };
  }
}
