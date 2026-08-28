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
  formatOperationScopeSubtitle,
  OperationActionKind,
  parseTerminalLogLine,
  SyncDiagramContext,
  SyncDiagramMode,
  SyncOperation,
  TableVisualStatus,
  TabelaAfetadaDTO,
} from '../models/sync-diagram.model';
import { SyncDiagramStateService } from './sync-diagram-state.service';

@Injectable()
export class SyncDiagramOperationService implements OnDestroy {
  private state = inject(SyncDiagramStateService);
  private explorador = inject(ExploradorVisualService);
  private progressoSync = inject(ProgressoSyncService);
  private ws = inject(WebsocketService);
  private baseService = inject(BaseService);

  private progressSub?: Subscription;
  private wsBridgeSub?: Subscription;
  private operationLogsSub?: Subscription;
  private activeOperationId?: string;
  private onOperationIdle?: () => void;

  constructor() {
    this.wsBridgeSub = this.ws.progresso$.subscribe((payload) => {
      const mensagem = String(payload?.mensagem ?? '').toLowerCase();
      const status = String(payload?.status ?? '');
      if (
        status.localeCompare('Concluído', undefined, { sensitivity: 'accent' }) === 0 &&
        mensagem.includes('verificação')
      ) {
        this.progressoSync.updateProgresso({
          ...payload,
          status: 'Processando',
          progresso: payload?.progresso ?? 0,
        });
        return;
      }
      this.progressoSync.updateProgresso(payload);
    });
  }

  ngOnDestroy(): void {
    this.progressSub?.unsubscribe();
    this.wsBridgeSub?.unsubscribe();
    this.operationLogsSub?.unsubscribe();
    this.onOperationIdle = undefined;
  }

  setOnOperationIdle(handler: () => void): void {
    this.onOperationIdle = handler;
  }

  private notifyOperationIdle(): void {
    this.onOperationIdle?.();
  }

  createOrReuseOperation(
    mode: SyncDiagramMode,
    action: OperationActionKind,
    context: SyncDiagramContext
  ): string | null {
    const existing = this.state.findOperationByScope(context, mode);
    if (
      existing &&
      this.state.isOperationRunning(existing) &&
      !this.state.isTerminalOperationPhase(existing.phase)
    ) {
      return null;
    }

    this.state.ensureNodesForContext(context);
    const operationPayload = this.buildOperationPayload(mode, action, context);

    if (existing) {
      if (existing.phase === 'aguardando') {
        this.state.promoteQueuedOperation(existing.id, action);
        this.trackOperation(existing.id);
        return existing.id;
      }
      this.state.reuseOperation(existing.id, operationPayload);
      this.trackOperation(existing.id);
      return existing.id;
    }

    const id = `op-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const operation: SyncOperation = { ...operationPayload, id };
    this.state.spawnOperation(operation);
    this.trackOperation(id);
    return id;
  }

  private buildOperationPayload(
    mode: SyncDiagramMode,
    action: OperationActionKind,
    context: SyncDiagramContext
  ): Omit<SyncOperation, 'id'> {
    const scope = formatOperationScopeSubtitle(context);

    return {
      mode,
      action,
      context: { ...context },
      anchorNodeId: this.state.resolveOperationAnchorNodeId(context),
      phase: action === 'sincronizar' ? 'sincronizando' : 'verificando',
      progress: 0,
      label: scope,
      detailOpen: false,
      errorsExpanded: false,
      estruturaResponse: undefined,
      tabelasAfetadas: undefined,
      errors: undefined,
      tabelaAtual: undefined,
      terminalLogs: [],
    };
  }

  beginSyncPhase(operationId: string): void {
    const op = this.state.getOperation(operationId);
    if (!op) return;
    this.state.patchOperation(operationId, {
      phase: 'sincronizando',
      progress: 0,
      label: formatOperationScopeSubtitle(op.context),
    });
    this.state.closeOperationDetail(operationId);
    this.trackOperation(operationId);
  }

  completeVerificar(
    operationId: string,
    mode: SyncDiagramMode,
    response: EstruturaResponse | { tabelas_afetadas?: TabelaAfetadaDTO[] }
  ): void {
    if (this.isCancelled(operationId)) return;

    if (mode === 'estrutura') {
      const estrutura = response as EstruturaResponse;
      this.state.patchOperation(operationId, {
        phase: 'verificado',
        progress: 100,
        estruturaResponse: estrutura,
      });
    } else {
      const tabelas = (response as { tabelas_afetadas?: TabelaAfetadaDTO[] }).tabelas_afetadas ?? [];
      this.state.patchOperation(operationId, {
        phase: 'verificado',
        progress: 100,
        tabelasAfetadas: tabelas,
      });
      this.state.applyDadosVisuals(operationId, tabelas);
      this.reloadColumnsAfterVerify(operationId);
    }
  }

  completeSync(
    operationId: string,
    res: { tabelas_afetadas?: TabelaAfetadaDTO[]; errors?: string[] }
  ): void {
    if (this.isCancelled(operationId)) return;

    const op = this.state.getOperation(operationId);
    const hasErrors = (res.errors?.length ?? 0) > 0;
    this.state.patchOperation(operationId, {
      phase: hasErrors ? 'erro' : 'concluido',
      progress: 100,
      tabelasAfetadas: res.tabelas_afetadas,
      errors: res.errors,
    });
    if (res.tabelas_afetadas && op?.mode !== 'estrutura') {
      this.state.applySyncResultVisuals(operationId, res.tabelas_afetadas, res.errors);
    }
    this.state.closeOperationDetail(operationId);
    this.releaseOperationTracking();
    this.notifyOperationIdle();
  }

  markCancelled(operationId: string): void {
    this.state.closeOperationDetail(operationId);
    this.state.resetOperationVisualsOnCancel(operationId);
    this.state.patchOperation(operationId, {
      phase: 'cancelado',
      progress: 0,
      tabelaAtual: undefined,
      errors: [],
      errorsExpanded: false,
    });
    if (this.activeOperationId === operationId) {
      this.releaseOperationTracking();
    }
    this.notifyOperationIdle();
  }

  failOperation(operationId: string, errors?: string[]): void {
    if (this.isCancelled(operationId)) return;
    this.state.patchOperation(operationId, {
      phase: 'erro',
      progress: 0,
      errors: errors?.length ? errors : ['A operação falhou. Tente novamente.'],
    });
    if (this.activeOperationId === operationId) {
      this.releaseOperationTracking();
    }
    this.notifyOperationIdle();
  }

  toggleErrorsExpanded(operationId: string): void {
    this.state.toggleOperationErrorsExpanded(operationId);
  }

  cancelOperation(operationId: string): void {
    const op = this.state.getOperation(operationId);
    if (!op) return;
    const cancellable =
      op.phase === 'verificando' ||
      op.phase === 'sincronizando' ||
      op.phase === 'verificado';
    if (!cancellable) return;

    this.markCancelled(operationId);
    this.progressoSync.marcarCancelado();
    this.ws.emitClearTerminal();

    const endpoint = op.mode === 'estrutura' ? 'estrutura/cancelar' : 'dados/cancelar';
    this.baseService.findAll(endpoint).subscribe({
      error: () => {
        // Cancelamento já refletido no diagrama
      },
    });
  }

  cancelActiveOperation(): void {
    const running = this.state
      .operations()
      .find((o) => this.state.isOperationRunning(o));
    if (running) {
      this.cancelOperation(running.id);
    }
  }

  hasRunningOperation(): boolean {
    return this.state.operations().some((o) => this.state.isOperationRunning(o));
  }

  isScopeActive(context: SyncDiagramContext, mode: SyncDiagramMode): boolean {
    const existing = this.state.findOperationByScope(context, mode);
    return existing ? this.state.isOperationRunning(existing) : false;
  }

  toggleDetail(operationId: string): void {
    const op = this.state.getOperation(operationId);
    if (!op) return;
    this.state.toggleOperationDetail(operationId);
  }

  prepareRetry(operation: SyncOperation): string | null {
    if (
      this.state.isOperationRunning(operation) &&
      !this.state.isTerminalOperationPhase(operation.phase)
    ) {
      return null;
    }
    const payload = this.buildOperationPayload(
      operation.mode,
      operation.action,
      operation.context
    );
    this.state.reuseOperation(operation.id, payload);
    this.state.closeOperationDetail(operation.id);
    this.ws.emitClearTerminal();
    return operation.id;
  }

  dismissOperation(operationId: string): void {
    const op = this.state.getOperation(operationId);
    if (!op) return;
    if (op.phase === 'verificando' || op.phase === 'sincronizando') return;

    if (this.activeOperationId === operationId) {
      this.activeOperationId = undefined;
    }
    this.state.removeOperation(operationId);
  }

  dismissQueuedOperation(operationId: string): void {
    const op = this.state.getOperation(operationId);
    if (!op || op.phase !== 'aguardando') return;
    this.dismissOperation(operationId);
  }

  trackQueueProgress(operationId: string): void {
    if (this.activeOperationId === operationId) {
      return;
    }
    this.trackOperation(operationId);
  }

  releaseQueueProgress(operationId: string): void {
    if (this.activeOperationId === operationId) {
      this.releaseOperationTracking();
    }
  }

  private loadErdGraph(operationId: string): void {
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

        this.loadColumnsForOperation(operationId, base, esquema, nodes);
      },
      error: () => {
        this.state.setErdGraph(operationId, [], []);
      },
    });
  }

  private reloadColumnsAfterVerify(operationId: string): void {
    const op = this.state.getOperation(operationId);
    if (!op?.context.base || !op.context.esquema) return;
    const tables = this.state.erdTablesForOperation(operationId);
    this.loadColumnsForOperation(operationId, op.context.base, op.context.esquema, tables);
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
          this.state.syncErdTableColumnVisuals(table.id);
        },
      });
    });
  }

  trackOperation(operationId: string): void {
    this.progressoSync.iniciarGenericoProgressoLocal();
    this.ws.emitClearTerminal();
    this.activeOperationId = operationId;
    this.operationLogsSub?.unsubscribe();
    this.operationLogsSub = this.ws.logs$.subscribe((msg) => {
      if (this.activeOperationId !== operationId) return;
      const entry = parseTerminalLogLine(msg);
      if (entry) {
        this.state.appendOperationLog(operationId, entry);
      }
    });

    if (!this.progressSub) {
      this.progressSub = this.progressoSync.progressoState$.subscribe((estado) => {
        this.handleProgressUpdate(estado);
      });
    }
  }

  private handleProgressUpdate(estado: {
    status: string;
    progresso?: number;
    tabelaAtual?: string | null;
  }): void {
    const opId = this.activeOperationId;
    if (!opId) return;

    const status = estado.status;
    if (status === 'IDLE') return;

    const op = this.state.getOperation(opId);
    if (!op) return;

    if (op.phase === 'cancelado') {
      this.activeOperationId = undefined;
      return;
    }

    const patch: Partial<SyncOperation> = {
      progress: estado.progresso ?? 0,
      tabelaAtual: estado.tabelaAtual ?? undefined,
    };

    if (status === 'RUNNING' && op.phase === 'verificado') {
      patch.phase = 'sincronizando';
    }

    if (status === 'CANCELADO') {
      if (op.phase !== 'verificando' && op.phase !== 'sincronizando' && op.phase !== 'verificado') {
        return;
      }
      this.markCancelled(opId);
      return;
    }

    if (status === 'ERRO') {
      if (op.phase !== 'verificando' && op.phase !== 'sincronizando' && op.phase !== 'verificado') {
        return;
      }
      patch.phase = 'erro';
      patch.progress = 0;
      patch.errors = op.errors?.length ? op.errors : ['Falha durante a operação'];
      this.state.patchOperation(opId, patch);
      this.releaseOperationTracking();
      return;
    }

    if (status === 'CONCLUIDO') {
      if (op.phase === 'sincronizando') {
        return;
      }
      patch.progress = 100;
    }

    this.state.patchOperation(opId, patch);
  }

  private releaseOperationTracking(): void {
    this.operationLogsSub?.unsubscribe();
    this.operationLogsSub = undefined;
    this.progressSub?.unsubscribe();
    this.progressSub = undefined;
    this.activeOperationId = undefined;
    this.progressoSync.resetar();
  }

  private isCancelled(operationId: string): boolean {
    return this.state.getOperation(operationId)?.phase === 'cancelado';
  }
}
