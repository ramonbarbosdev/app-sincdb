import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { EstruturaResponse } from '../../../components/estrutura-preview/estrutura-preview';
import { BaseService } from '../../../services/base.service';
import { ProgressoSyncService } from '../../../services/progresso-sync-service';
import { WebsocketService } from '../../../services/websocket.service';
import { ExploradorVisualService } from '../../explorador-visual/services/explorador-visual.service';
import {
  ColumnVisualState,
  ErdEdge,
  ErdTableNode,
  OperationActionKind,
  SyncDiagramContext,
  SyncDiagramMode,
  SyncOperation,
  TableVisualStatus,
  TabelaAfetadaDTO,
} from '../models/sync-diagram.model';
import { SyncDiagramCameraService } from './sync-diagram-camera.service';
import { SyncDiagramStateService } from './sync-diagram-state.service';

@Injectable()
export class SyncDiagramOperationService implements OnDestroy {
  private state = inject(SyncDiagramStateService);
  private explorador = inject(ExploradorVisualService);
  private progressoSync = inject(ProgressoSyncService);
  private ws = inject(WebsocketService);
  private baseService = inject(BaseService);
  private camera = inject(SyncDiagramCameraService);

  private progressSub?: Subscription;
  private wsBridgeSub?: Subscription;
  private activeOperationId?: string;

  constructor() {
    this.wsBridgeSub = this.ws.progresso$.subscribe((payload) => {
      this.progressoSync.updateProgresso(payload);
    });
  }

  ngOnDestroy(): void {
    this.progressSub?.unsubscribe();
    this.wsBridgeSub?.unsubscribe();
  }

  createOperation(
    mode: SyncDiagramMode,
    action: OperationActionKind,
    context: SyncDiagramContext
  ): string {
    const id = `op-${Date.now()}`;
    const scope = this.formatScope(context);
    const actionLabel =
      action === 'verificar'
        ? 'Verificar'
        : action === 'sincronizar'
          ? 'Sincronizar'
          : 'Verificar + sync';
    const modeLabel = mode === 'estrutura' ? 'estrutura' : 'dados';

    const operation: SyncOperation = {
      id,
      mode,
      action,
      context: { ...context },
      phase: action === 'sincronizar' ? 'sincronizando' : 'verificando',
      progress: 0,
      label: `${actionLabel} ${modeLabel} · ${scope}`,
      detailOpen: true,
    };

    this.state.spawnOperation(operation);
    this.trackOperation(id);
    this.loadErdGraph(id, true);
    return id;
  }

  beginSyncPhase(operationId: string): void {
    this.state.patchOperation(operationId, {
      phase: 'sincronizando',
      progress: 0,
    });
    this.trackOperation(operationId);
    this.scheduleFocusZone(operationId);
  }

  completeVerificar(
    operationId: string,
    mode: SyncDiagramMode,
    response: EstruturaResponse | { tabelas_afetadas?: TabelaAfetadaDTO[] }
  ): void {
    if (mode === 'estrutura') {
      const estrutura = response as EstruturaResponse;
      this.state.patchOperation(operationId, {
        phase: 'verificado',
        progress: 100,
        estruturaResponse: estrutura,
      });
      this.state.applyEstruturaVisuals(operationId, estrutura);
    } else {
      const tabelas = (response as { tabelas_afetadas?: TabelaAfetadaDTO[] }).tabelas_afetadas ?? [];
      this.state.patchOperation(operationId, {
        phase: 'verificado',
        progress: 100,
        tabelasAfetadas: tabelas,
      });
      this.state.applyDadosVisuals(operationId, tabelas);
    }
    this.scheduleFocusZone(operationId);
  }

  completeSync(
    operationId: string,
    res: { tabelas_afetadas?: TabelaAfetadaDTO[]; errors?: string[] }
  ): void {
    const hasErrors = (res.errors?.length ?? 0) > 0;
    this.state.patchOperation(operationId, {
      phase: hasErrors ? 'erro' : 'concluido',
      progress: 100,
      tabelasAfetadas: res.tabelas_afetadas,
      errors: res.errors,
    });
    if (res.tabelas_afetadas) {
      this.state.applySyncResultVisuals(operationId, res.tabelas_afetadas, res.errors);
    }
    this.activeOperationId = undefined;
    this.scheduleFocusZone(operationId);
  }

  failOperation(operationId: string): void {
    this.state.patchOperation(operationId, { phase: 'erro' });
    if (this.activeOperationId === operationId) {
      this.activeOperationId = undefined;
    }
  }

  cancelOperation(operationId: string): void {
    const op = this.state.getOperation(operationId);
    if (!op) return;
    if (op.phase !== 'verificando' && op.phase !== 'sincronizando') return;

    const endpoint = op.mode === 'estrutura' ? 'estrutura/cancelar' : 'dados/cancelar';
    this.baseService.findAll(endpoint).subscribe({
      next: () => {
        this.state.patchOperation(operationId, { phase: 'cancelado', progress: 0 });
        this.progressoSync.resetar();
        this.ws.emitClearTerminal();
        if (this.activeOperationId === operationId) {
          this.activeOperationId = undefined;
        }
      },
      error: () => {
        this.state.patchOperation(operationId, {
          phase: 'erro',
          errors: ['Falha ao cancelar a operação'],
        });
      },
    });
  }

  cancelActiveOperation(): void {
    const running = this.state
      .operations()
      .find((o) => o.phase === 'verificando' || o.phase === 'sincronizando');
    if (running) {
      this.cancelOperation(running.id);
    }
  }

  hasRunningOperation(): boolean {
    return this.state
      .operations()
      .some((o) => o.phase === 'verificando' || o.phase === 'sincronizando');
  }

  toggleDetail(operationId: string): void {
    const op = this.state.getOperation(operationId);
    if (!op) return;
    const opening = !op.detailOpen;
    this.state.toggleOperationDetail(operationId);
    if (opening) {
      this.loadErdGraph(operationId, true);
    }
  }

  closeDetail(operationId: string): void {
    this.state.closeOperationDetail(operationId);
  }

  private loadErdGraph(operationId: string, focusAfter = false): void {
    const op = this.state.getOperation(operationId);
    if (!op?.detailOpen) return;

    const base = op.context.base;
    const esquema = op.context.esquema;
    if (!base || !esquema) return;

    this.explorador.grafoSchemaAmbiente('cloud', base, esquema).subscribe({
      next: (grafo) => {
        const nodes: ErdTableNode[] = (grafo.nodes ?? []).map((n) => ({
          id: `erd-${operationId}-${n.id}`,
          operationId,
          nome: n.nome,
          status: 'idle' as TableVisualStatus,
          columns: [],
          mode: op.mode,
        }));
        const edges: ErdEdge[] = (grafo.edges ?? []).map((e) => ({
          id: `erd-edge-${operationId}-${e.id}`,
          operationId,
          sourceId: `erd-${operationId}-${e.source}`,
          targetId: `erd-${operationId}-${e.target}`,
          status: 'idle' as const,
        }));
        this.state.setErdGraph(operationId, nodes, edges);

        const refreshed = this.state.getOperation(operationId);
        if (refreshed?.estruturaResponse) {
          this.state.applyEstruturaVisuals(operationId, refreshed.estruturaResponse);
        }
        if (refreshed?.tabelasAfetadas) {
          this.state.applyDadosVisuals(operationId, refreshed.tabelasAfetadas);
        }

        if (op.mode === 'dados') {
          this.loadColumnsForOperation(operationId, base, esquema, nodes);
        }

        if (focusAfter) {
          this.scheduleFocusZone(operationId);
        }
      },
      error: () => {
        this.state.setErdGraph(operationId, [], []);
      },
    });
  }

  private loadColumnsForOperation(
    operationId: string,
    base: string,
    esquema: string,
    tables: ErdTableNode[]
  ): void {
    tables.forEach((table) => {
      const tableName = table.nome.includes('.') ? table.nome.split('.').pop()! : table.nome;
      this.explorador.detalharTabela(base, esquema, tableName).subscribe({
        next: (detalhe) => {
          const columns: ColumnVisualState[] = (detalhe.colunas ?? []).map((c) => ({
            nome: c.nome,
            status: 'idle',
          }));
          this.state.patchErdTable(table.id, { columns });
        },
      });
    });
  }

  private scheduleFocusZone(operationId: string): void {
    setTimeout(() => this.camera.focusImpactZone(operationId), 150);
  }

  private trackOperation(operationId: string): void {
    this.activeOperationId = operationId;
    if (!this.progressSub) {
      this.progressSub = this.progressoSync.progressoState$.subscribe((estado) => {
        const opId = this.activeOperationId;
        if (!opId) return;

        const status = estado.status;
        if (status === 'IDLE') return;

        const op = this.state.getOperation(opId);
        if (!op) return;

        const patch: Partial<SyncOperation> = {
          progress: estado.progresso ?? 0,
          tabelaAtual: estado.tabelaAtual ?? undefined,
        };

        if (status === 'RUNNING') {
          if (op.phase === 'verificado' || op.action === 'verificar-sync') {
            patch.phase = 'sincronizando';
          } else if (op.phase === 'verificando') {
            patch.phase = 'verificando';
          }
        }

        if (estado.tabelaAtual) {
          this.state.highlightRunningTable(opId, estado.tabelaAtual);
          const tableNodeId = this.state.findErdTableNodeId(opId, estado.tabelaAtual);
          if (tableNodeId) {
            this.camera.focusTableDebounced(tableNodeId);
          }
        }

        if (status === 'ERRO') {
          patch.phase = 'erro';
          this.activeOperationId = undefined;
        }

        if (status === 'CANCELADO') {
          patch.phase = 'cancelado';
          patch.progress = 0;
          this.activeOperationId = undefined;
        }

        if (status === 'CONCLUIDO') {
          patch.progress = 100;
        }

        this.state.patchOperation(opId, patch);
      });
    }
  }

  private formatScope(context: SyncDiagramContext): string {
    const parts: string[] = [];
    if (context.base) parts.push(context.base);
    if (context.esquema) parts.push(context.esquema);
    if (context.tabela) parts.push(context.tabela);
    return parts.join('.') || '—';
  }
}
