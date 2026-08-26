import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { EstruturaResponse } from '../../../components/estrutura-preview/estrutura-preview';
import { Conexao } from '../../../models/conexao';
import { BaseService } from '../../../services/base.service';
import { ProgressoSyncService } from '../../../services/progresso-sync-service';
import {
  OperationActionKind,
  SyncDiagramContext,
  SyncDiagramMode,
  SyncOperation,
  SyncQueueItem,
  TabelaAfetadaDTO,
} from '../models/sync-diagram.model';
import { SyncDiagramOperationService } from './sync-diagram-operation.service';
import { SyncDiagramQueueService } from './sync-diagram-queue.service';
import { SyncDiagramStateService } from './sync-diagram-state.service';

@Injectable()
export class SyncDiagramActionsService {
  private baseService = inject(BaseService);
  private progressoSync = inject(ProgressoSyncService);
  private messageService = inject(MessageService);
  private operations = inject(SyncDiagramOperationService);
  private queue = inject(SyncDiagramQueueService);
  private state = inject(SyncDiagramStateService);

  private batchActive = false;
  private conexaoPadrao?: Conexao;

  constructor() {
    this.operations.setOnOperationIdle(() => this.handleOperationIdle());
  }

  hasConexaoPadrao(): boolean {
    return !!this.conexaoPadrao;
  }

  isBatchActive(): boolean {
    return this.batchActive;
  }

  loadConexaoPadrao(): void {
    this.baseService.findAll('conexao').subscribe({
      next: (res: unknown) => {
        const lista = Array.isArray(res)
          ? res
          : (res as { conexoes?: Conexao[]; items?: Conexao[]; content?: Conexao[] })?.conexoes ||
            (res as { items?: Conexao[] })?.items ||
            (res as { content?: Conexao[] })?.content ||
            [];
        this.conexaoPadrao = this.normalizarConexaoPadrao(
          lista.find((item: Conexao) => item.fl_padrao) || lista[0]
        );
      },
      error: () => {
        this.conexaoPadrao = undefined;
      },
    });
  }

  private normalizarConexaoPadrao(conexao: Conexao | undefined): Conexao | undefined {
    if (!conexao) return undefined;

    const raw = conexao as Conexao & {
      cloud?: Partial<Conexao>;
      local?: Partial<Conexao>;
    };

    return {
      ...conexao,
      db_cloud_host: conexao.db_cloud_host ?? raw.cloud?.db_cloud_host ?? '',
      db_cloud_port: conexao.db_cloud_port ?? raw.cloud?.db_cloud_port ?? '',
      db_cloud_user: conexao.db_cloud_user ?? raw.cloud?.db_cloud_user ?? '',
      db_cloud_password: conexao.db_cloud_password ?? raw.cloud?.db_cloud_password ?? '',
      fl_admin: conexao.fl_admin ?? raw.cloud?.fl_admin ?? false,
      db_local_host: conexao.db_local_host ?? raw.local?.db_local_host ?? '',
      db_local_port: conexao.db_local_port ?? raw.local?.db_local_port ?? '',
      db_local_user: conexao.db_local_user ?? raw.local?.db_local_user ?? '',
      db_local_password: conexao.db_local_password ?? raw.local?.db_local_password ?? '',
    };
  }

  private resolveTabelaParam(context: SyncDiagramContext): string | null {
    const base = context.base;
    const esquema = context.esquema;
    if (!base || !esquema) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Seleção incompleta',
        detail: 'Selecione base e schema no diagrama.',
      });
      return null;
    }
    if (context.tabela) return context.tabela;
    if (context.tabelas?.length === 1) return context.tabelas[0];
    return esquema;
  }

  private expandContexts(
    context: SyncDiagramContext,
    options?: { silent?: boolean }
  ): SyncDiagramContext[] {
    const base = context.base;
    const esquema = context.esquema;
    if (!base || !esquema) {
      if (!options?.silent) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Seleção incompleta',
          detail: 'Selecione base e schema no diagrama.',
        });
      }
      return [];
    }

    const tabelas = context.tabelas?.length
      ? context.tabelas
      : context.tabela
        ? [context.tabela]
        : [];

    if (!tabelas.length) {
      return [{ base, esquema }];
    }

    return tabelas.map((tabela: string) => ({ base, esquema, tabela, tabelas: [tabela] }));
  }

  verificarESincronizar(context: SyncDiagramContext, mode: SyncDiagramMode): void {
    this.syncNow(context, mode);
  }

  syncNow(context: SyncDiagramContext, mode: SyncDiagramMode): void {
    if (!this.guardCanStartSync()) return;

    const contexts = this.expandContexts(context);
    if (!contexts.length) return;

    const base = contexts[0].base;
    const esquema = contexts[0].esquema;
    if (!base || !esquema) return;

    this.batchActive = true;

    this.baseService.findAll(`sincronizacao/verificaesquema/${base}/${esquema}`).subscribe({
      next: () => {
        this.runSequentialVerifySync(contexts, mode, 0, () => this.finishBatchAndDrain());
      },
      error: () => {
        this.batchActive = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Conexão indisponível',
          detail: 'Não foi possível validar o schema no ambiente local. Verifique a conexão padrão.',
        });
      },
    });
  }

  addToQueue(context: SyncDiagramContext, mode: SyncDiagramMode): void {
    if (!this.guardCanEnqueue(context, mode)) return;
    this.queue.enqueue(context, mode);
  }

  canEnqueue(context: SyncDiagramContext, mode: SyncDiagramMode): boolean {
    if (!this.hasConexaoPadrao()) return false;
    const base = context.base;
    const esquema = context.esquema;
    if (!base || !esquema) return false;
    if (this.isScopeRunning(context, mode)) return false;
    if (this.queue.hasScope(context, mode)) return false;
    return true;
  }

  runQueue(): void {
    if (!this.guardCanStartSync()) return;
    this.drainQueue();
  }

  drainQueue(): void {
    if (this.batchActive || this.operations.hasRunningOperation()) return;

    const items = this.queue.items();
    if (!items.length) return;

    const item = items[0];
    this.queue.remove(item.id);
    this.processQueueItem(item);
  }

  removeFromQueue(id: string): void {
    this.queue.remove(id);
  }

  clearQueue(): void {
    this.queue.clear();
  }

  private handleOperationIdle(): void {
    if (this.batchActive && !this.operations.hasRunningOperation()) {
      this.batchActive = false;
    }
    this.drainQueue();
  }

  private finishBatchAndDrain(): void {
    this.batchActive = false;
    this.drainQueue();
  }

  private processQueueItem(item: SyncQueueItem): void {
    const contexts = this.expandContexts(item.context, { silent: true });
    if (!contexts.length) {
      this.drainQueue();
      return;
    }

    const base = contexts[0].base;
    const esquema = contexts[0].esquema;
    if (!base || !esquema) {
      this.drainQueue();
      return;
    }

    this.batchActive = true;

    this.baseService.findAll(`sincronizacao/verificaesquema/${base}/${esquema}`).subscribe({
      next: () => {
        this.runSequentialVerifySync(contexts, item.mode, 0, () => this.finishBatchAndDrain());
      },
      error: () => {
        this.batchActive = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Fila · conexão indisponível',
          detail: `Não foi possível validar ${item.label}. Próximo item da fila será processado.`,
        });
        this.drainQueue();
      },
    });
  }

  private runSequentialVerifySync(
    contexts: SyncDiagramContext[],
    mode: SyncDiagramMode,
    index: number,
    onBatchFinished?: () => void
  ): void {
    if (index >= contexts.length) {
      onBatchFinished?.();
      return;
    }

    const ctx = contexts[index];
    const onFinished = () =>
      this.runSequentialVerifySync(contexts, mode, index + 1, onBatchFinished);

    if (mode === 'estrutura') {
      this.verificarESincronizarEstrutura(ctx, onFinished);
    } else {
      this.verificarESincronizarDados(ctx, onFinished);
    }
  }

  retryOperation(operation: SyncOperation): void {
    if (!this.guardCanStartSync()) return;
    const { id, context, mode, action } = operation;
    this.state.removeOperation(id);
    this.runOperationAction(mode, action, context);
  }

  private runOperationAction(
    mode: SyncDiagramMode,
    action: OperationActionKind,
    context: SyncDiagramContext
  ): void {
    if (mode === 'estrutura') {
      if (action === 'verificar') {
        this.verificarEstrutura(context);
      } else if (action === 'sincronizar') {
        this.sincronizarEstrutura(context);
      } else {
        this.syncNow(context, mode);
      }
      return;
    }

    if (action === 'verificar') {
      this.verificarDados(context);
    } else if (action === 'sincronizar') {
      this.sincronizarDados(context);
    } else {
      this.syncNow(context, mode);
    }
  }

  private guardCanStartSync(): boolean {
    if (!this.hasConexaoPadrao()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Conexão não configurada',
        detail: 'Configure uma conexão padrão em Conexões antes de sincronizar.',
      });
      return false;
    }

    if (this.operations.hasRunningOperation()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Operação em andamento',
        detail: 'Aguarde a operação atual ou cancele antes de iniciar outra.',
      });
      return false;
    }

    if (this.batchActive) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sincronização em lote',
        detail: 'Já existe uma sequência de sincronização em andamento.',
      });
      return false;
    }

    return true;
  }

  private guardCanEnqueue(context: SyncDiagramContext, mode: SyncDiagramMode): boolean {
    if (!this.hasConexaoPadrao()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Conexão não configurada',
        detail: 'Configure uma conexão padrão em Conexões antes de enfileirar.',
      });
      return false;
    }

    const base = context.base;
    const esquema = context.esquema;
    if (!base || !esquema) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Seleção incompleta',
        detail: 'Selecione base e schema no diagrama.',
      });
      return false;
    }

    if (this.isScopeRunning(context, mode)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Operação em andamento',
        detail: 'Este escopo já está em execução. Aguarde ou cancele antes de enfileirar.',
      });
      return false;
    }

    if (this.queue.hasScope(context, mode)) {
      return false;
    }

    return true;
  }

  private isScopeRunning(context: SyncDiagramContext, mode: SyncDiagramMode): boolean {
    const existing = this.state.findOperationByScope(context, mode);
    return existing ? this.state.isOperationRunning(existing) : false;
  }

  private failOp(opId: string, message: string, onFinished?: () => void): void {
    if (this.isOperationCancelled(opId)) {
      onFinished?.();
      return;
    }
    this.operations.failOperation(opId, [message]);
    this.progressoSync.marcarErro(message);
    onFinished?.();
  }

  private isCancelResponse(res: unknown): boolean {
    if (!res || typeof res !== 'object') return false;
    const message = String((res as { message?: string }).message ?? '').toLowerCase();
    return message.includes('cancel');
  }

  private isOperationCancelled(opId: string): boolean {
    return this.state.getOperation(opId)?.phase === 'cancelado';
  }

  private warnOperationInProgress(context: SyncDiagramContext, mode: SyncDiagramMode): void {
    const parts: string[] = [];
    if (context.base) parts.push(context.base);
    if (context.esquema) parts.push(context.esquema);
    const tabela =
      context.tabela ?? (context.tabelas?.length === 1 ? context.tabelas[0] : undefined);
    if (tabela) parts.push(tabela);
    const scope = parts.join('.') || 'seleção atual';
    this.messageService.add({
      severity: 'warn',
      summary: 'Operação em andamento',
      detail: `Já existe uma operação de ${mode} em execução para ${scope}. Aguarde ou cancele antes de iniciar outra.`,
    });
  }

  private startOperation(
    mode: SyncDiagramMode,
    action: OperationActionKind,
    context: SyncDiagramContext
  ): string | null {
    const opId = this.operations.createOrReuseOperation(mode, action, context);
    if (!opId) {
      this.warnOperationInProgress(context, mode);
    }
    return opId;
  }

  private resolveCancelledFromResponse(
    opId: string,
    res: unknown,
    onFinished?: () => void
  ): boolean {
    if (this.isOperationCancelled(opId)) {
      onFinished?.();
      return true;
    }
    if (this.isCancelResponse(res)) {
      this.operations.markCancelled(opId);
      this.progressoSync.marcarCancelado();
      onFinished?.();
      return true;
    }
    return false;
  }

  verificarEstrutura(context: SyncDiagramContext): void {
    if (!this.guardCanStartSync()) return;

    const base = context.base;
    const esquema = context.esquema;
    const tabelaParam = this.resolveTabelaParam(context);
    if (!base || !esquema || !tabelaParam) return;

    const opId = this.startOperation('estrutura', 'verificar', context);
    if (!opId) return;
    this.progressoSync.iniciarGenericoProgressoLocal();

    this.baseService.findAll(`sincronizacao/verificaesquema/${base}/${esquema}`).subscribe({
      next: () => {
        this.baseService
          .findAll(`estrutura/verificar/${base}/${esquema}/${tabelaParam}`)
          .subscribe({
            next: (res) => {
              if (this.resolveCancelledFromResponse(opId, res)) return;
              this.operations.completeVerificar(opId, 'estrutura', res as EstruturaResponse);
              this.messageService.add({
                severity: 'success',
                summary: 'Estrutura verificada',
                detail: `${base}.${esquema}`,
              });
            },
            error: () => {
              this.failOp(opId, 'Falha na verificação de estrutura');
            },
          });
      },
      error: () => {
        this.failOp(opId, 'Falha ao verificar esquema');
      },
    });
  }

  sincronizarEstrutura(context: SyncDiagramContext): void {
    if (!this.guardCanStartSync()) return;
    this.sincronizarEstruturaInterno(context, false);
  }

  private verificarESincronizarEstrutura(
    context: SyncDiagramContext,
    onFinished?: () => void
  ): void {
    const base = context.base;
    const esquema = context.esquema;
    const tabelaParam = this.resolveTabelaParam(context);
    if (!base || !esquema || !tabelaParam) {
      onFinished?.();
      return;
    }

    const opId = this.startOperation('estrutura', 'verificar-sync', context);
    if (!opId) {
      onFinished?.();
      return;
    }
    this.progressoSync.iniciarGenericoProgressoLocal();

    this.baseService.findAll(`estrutura/verificar/${base}/${esquema}/${tabelaParam}`).subscribe({
      next: (res) => {
        if (this.resolveCancelledFromResponse(opId, res, onFinished)) return;
        this.operations.completeVerificar(opId, 'estrutura', res as EstruturaResponse);
        if (this.isOperationCancelled(opId)) {
          onFinished?.();
          return;
        }
        this.operations.beginSyncPhase(opId);
        this.sincronizarEstruturaInterno(context, true, opId, onFinished);
      },
      error: () => {
        this.failOp(opId, 'Falha na verificação de estrutura', onFinished);
      },
    });
  }

  private sincronizarEstruturaInterno(
    context: SyncDiagramContext,
    jaIniciado: boolean,
    existingOpId?: string,
    onFinished?: () => void
  ): void {
    const base = context.base;
    const esquema = context.esquema;
    if (!base || !esquema) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Seleção incompleta',
        detail: 'Selecione base e schema.',
      });
      onFinished?.();
      return;
    }

    let opId: string | undefined = existingOpId;
    if (!opId) {
      const created = this.startOperation('estrutura', 'sincronizar', context);
      if (!created) {
        onFinished?.();
        return;
      }
      opId = created;
    }

    if (!jaIniciado) {
      this.progressoSync.iniciarGenericoProgressoLocal();
    } else if (!existingOpId) {
      this.operations.beginSyncPhase(opId);
    }

    this.baseService.findAll(`estrutura/${base}/${esquema}`).subscribe({
      next: (res: { errors?: string[]; tabelas_afetadas?: TabelaAfetadaDTO[]; message?: string }) => {
        if (this.resolveCancelledFromResponse(opId!, res, onFinished)) return;
        if (res?.errors?.length) {
          this.operations.completeSync(opId!, {
            errors: res.errors,
            tabelas_afetadas: res.tabelas_afetadas,
          });
          this.progressoSync.marcarErro('Sincronização de estrutura com erros');
          this.messageService.add({
            severity: 'warn',
            summary: 'Estrutura com erros',
            detail: `${base}.${esquema}`,
          });
          onFinished?.();
          return;
        }
        this.operations.completeSync(opId!, {
          tabelas_afetadas: res.tabelas_afetadas,
          errors: res.errors,
        });
        this.messageService.add({
          severity: 'success',
          summary: 'Estrutura sincronizada',
          detail: `${base}.${esquema}`,
        });
        onFinished?.();
      },
      error: () => {
        this.failOp(opId!, 'Falha na sincronização de estrutura', onFinished);
      },
    });
  }

  verificarDados(context: SyncDiagramContext): void {
    if (!this.guardCanStartSync()) return;

    const base = context.base;
    const esquema = context.esquema;
    const tabelaParam = this.resolveTabelaParam(context);
    if (!base || !esquema || !tabelaParam) return;

    const opId = this.startOperation('dados', 'verificar', context);
    if (!opId) return;
    this.progressoSync.iniciarGenericoProgressoLocal();

    this.baseService.findAll(`sincronizacao/verificaesquema/${base}/${esquema}`).subscribe({
      next: () => {
        this.baseService
          .findAll(`dados/verificar/${base}/${esquema}/${tabelaParam}`)
          .subscribe({
            next: (res) => {
              if (this.resolveCancelledFromResponse(opId, res)) return;
              this.operations.completeVerificar(opId, 'dados', res as { tabelas_afetadas?: TabelaAfetadaDTO[] });
              this.messageService.add({
                severity: 'success',
                summary: 'Dados verificados',
                detail: `${base}.${esquema}`,
              });
            },
            error: () => {
              this.failOp(opId, 'Falha na verificação de dados');
            },
          });
      },
      error: () => {
        this.failOp(opId, 'Falha ao verificar esquema');
      },
    });
  }

  sincronizarDados(context: SyncDiagramContext): void {
    if (!this.guardCanStartSync()) return;
    this.sincronizarDadosInterno(context, false);
  }

  private verificarESincronizarDados(
    context: SyncDiagramContext,
    onFinished?: () => void
  ): void {
    const base = context.base;
    const esquema = context.esquema;
    const tabelaParam = this.resolveTabelaParam(context);
    if (!base || !esquema || !tabelaParam) {
      onFinished?.();
      return;
    }

    const opId = this.startOperation('dados', 'verificar-sync', context);
    if (!opId) {
      onFinished?.();
      return;
    }
    this.progressoSync.iniciarGenericoProgressoLocal();

    this.baseService.findAll(`dados/verificar/${base}/${esquema}/${tabelaParam}`).subscribe({
      next: (res) => {
        if (this.resolveCancelledFromResponse(opId, res, onFinished)) return;
        this.operations.completeVerificar(opId, 'dados', res as { tabelas_afetadas?: TabelaAfetadaDTO[] });
        if (this.isOperationCancelled(opId)) {
          onFinished?.();
          return;
        }
        this.operations.beginSyncPhase(opId);
        this.sincronizarDadosInterno(context, true, opId, onFinished);
      },
      error: () => {
        this.failOp(opId, 'Falha na verificação de dados', onFinished);
      },
    });
  }

  private sincronizarDadosInterno(
    context: SyncDiagramContext,
    jaIniciado: boolean,
    existingOpId?: string,
    onFinished?: () => void
  ): void {
    const base = context.base;
    const esquema = context.esquema;
    if (!base || !esquema) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Seleção incompleta',
        detail: 'Selecione base e schema.',
      });
      onFinished?.();
      return;
    }

    let opId: string | undefined = existingOpId;
    if (!opId) {
      const created = this.startOperation('dados', 'sincronizar', context);
      if (!created) {
        onFinished?.();
        return;
      }
      opId = created;
    }

    if (!jaIniciado) {
      this.progressoSync.iniciarGenericoProgressoLocal();
    } else if (!existingOpId) {
      this.operations.beginSyncPhase(opId);
    }

    this.baseService.findAll(`dados/${base}/${esquema}`).subscribe({
      next: (res: { errors?: string[]; tabelas_afetadas?: TabelaAfetadaDTO[]; message?: string }) => {
        if (this.resolveCancelledFromResponse(opId!, res, onFinished)) return;
        if (res?.errors?.length) {
          this.operations.completeSync(opId!, {
            errors: res.errors,
            tabelas_afetadas: res.tabelas_afetadas,
          });
          this.progressoSync.marcarErro('Sincronização de dados com erros');
          this.messageService.add({
            severity: 'warn',
            summary: 'Dados com erros',
            detail: `${base}.${esquema}`,
          });
          onFinished?.();
          return;
        }
        this.operations.completeSync(opId!, {
          tabelas_afetadas: res.tabelas_afetadas,
          errors: res.errors,
        });
        this.messageService.add({
          severity: 'success',
          summary: 'Dados sincronizados',
          detail: `${base}.${esquema}`,
        });
        onFinished?.();
      },
      error: () => {
        this.failOp(opId!, 'Falha na sincronização de dados', onFinished);
      },
    });
  }
}
