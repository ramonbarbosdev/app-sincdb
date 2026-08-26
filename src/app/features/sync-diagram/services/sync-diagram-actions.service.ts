import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { EstruturaResponse } from '../../../components/estrutura-preview/estrutura-preview';
import { BaseService } from '../../../services/base.service';
import { ProgressoSyncService } from '../../../services/progresso-sync-service';
import {
  OperationActionKind,
  SyncDiagramContext,
  SyncDiagramMode,
  SyncOperation,
  TabelaAfetadaDTO,
} from '../models/sync-diagram.model';
import { SyncDiagramOperationService } from './sync-diagram-operation.service';
import { SyncDiagramStateService } from './sync-diagram-state.service';

@Injectable()
export class SyncDiagramActionsService {
  private baseService = inject(BaseService);
  private progressoSync = inject(ProgressoSyncService);
  private messageService = inject(MessageService);
  private operations = inject(SyncDiagramOperationService);
  private state = inject(SyncDiagramStateService);

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
    return context.tabela ? context.tabela : esquema;
  }

  verificarESincronizar(context: SyncDiagramContext, mode: SyncDiagramMode): void {
    if (mode === 'estrutura') {
      this.verificarESincronizarEstrutura(context);
    } else {
      this.verificarESincronizarDados(context);
    }
  }

  retryOperation(operation: SyncOperation): void {
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
        this.verificarESincronizarEstrutura(context);
      }
      return;
    }

    if (action === 'verificar') {
      this.verificarDados(context);
    } else if (action === 'sincronizar') {
      this.sincronizarDados(context);
    } else {
      this.verificarESincronizarDados(context);
    }
  }

  private failOp(opId: string, message: string): void {
    this.operations.failOperation(opId, [message]);
    this.progressoSync.marcarErro(message);
  }

  verificarEstrutura(context: SyncDiagramContext): void {
    const base = context.base;
    const esquema = context.esquema;
    const tabelaParam = this.resolveTabelaParam(context);
    if (!base || !esquema || !tabelaParam) return;

    const opId = this.operations.createOperation('estrutura', 'verificar', context);
    this.progressoSync.iniciarGenericoProgressoLocal();

    this.baseService.findAll(`sincronizacao/verificaesquema/${base}/${esquema}`).subscribe({
      next: () => {
        this.baseService
          .findAll(`estrutura/verificar/${base}/${esquema}/${tabelaParam}`)
          .subscribe({
            next: (res) => {
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
    this.sincronizarEstruturaInterno(context, false);
  }

  private verificarESincronizarEstrutura(context: SyncDiagramContext): void {
    const base = context.base;
    const esquema = context.esquema;
    const tabelaParam = this.resolveTabelaParam(context);
    if (!base || !esquema || !tabelaParam) return;

    const opId = this.operations.createOperation('estrutura', 'verificar-sync', context);
    this.progressoSync.iniciarGenericoProgressoLocal();

    this.baseService.findAll(`estrutura/verificar/${base}/${esquema}/${tabelaParam}`).subscribe({
      next: (res) => {
        this.operations.completeVerificar(opId, 'estrutura', res as EstruturaResponse);
        this.operations.beginSyncPhase(opId);
        this.sincronizarEstruturaInterno(context, true, opId);
      },
      error: () => {
        this.failOp(opId, 'Falha na verificação de estrutura');
      },
    });
  }

  private sincronizarEstruturaInterno(
    context: SyncDiagramContext,
    jaIniciado: boolean,
    existingOpId?: string
  ): void {
    const base = context.base;
    const esquema = context.esquema;
    if (!base || !esquema) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Seleção incompleta',
        detail: 'Selecione base e schema.',
      });
      return;
    }

    const opId =
      existingOpId ?? this.operations.createOperation('estrutura', 'sincronizar', context);

    if (!jaIniciado) {
      this.progressoSync.iniciarGenericoProgressoLocal();
    } else if (!existingOpId) {
      this.operations.beginSyncPhase(opId);
    }

    this.baseService.findAll(`estrutura/${base}/${esquema}`).subscribe({
      next: (res: { errors?: string[]; tabelas_afetadas?: TabelaAfetadaDTO[] }) => {
        if (res?.errors?.length) {
          this.operations.completeSync(opId, { errors: res.errors, tabelas_afetadas: res.tabelas_afetadas });
          this.progressoSync.marcarErro('Sincronização de estrutura com erros');
          return;
        }
        this.operations.completeSync(opId, {
          tabelas_afetadas: res.tabelas_afetadas,
          errors: res.errors,
        });
        this.messageService.add({
          severity: 'success',
          summary: 'Estrutura sincronizada',
          detail: `${base}.${esquema}`,
        });
      },
      error: () => {
        this.failOp(opId, 'Falha na sincronização de estrutura');
      },
    });
  }

  verificarDados(context: SyncDiagramContext): void {
    const base = context.base;
    const esquema = context.esquema;
    const tabelaParam = this.resolveTabelaParam(context);
    if (!base || !esquema || !tabelaParam) return;

    const opId = this.operations.createOperation('dados', 'verificar', context);
    this.progressoSync.iniciarGenericoProgressoLocal();

    this.baseService.findAll(`sincronizacao/verificaesquema/${base}/${esquema}`).subscribe({
      next: () => {
        this.baseService
          .findAll(`dados/verificar/${base}/${esquema}/${tabelaParam}`)
          .subscribe({
            next: (res) => {
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
    this.sincronizarDadosInterno(context, false);
  }

  private verificarESincronizarDados(context: SyncDiagramContext): void {
    const base = context.base;
    const esquema = context.esquema;
    const tabelaParam = this.resolveTabelaParam(context);
    if (!base || !esquema || !tabelaParam) return;

    const opId = this.operations.createOperation('dados', 'verificar-sync', context);
    this.progressoSync.iniciarGenericoProgressoLocal();

    this.baseService.findAll(`dados/verificar/${base}/${esquema}/${tabelaParam}`).subscribe({
      next: (res) => {
        this.operations.completeVerificar(opId, 'dados', res as { tabelas_afetadas?: TabelaAfetadaDTO[] });
        this.operations.beginSyncPhase(opId);
        this.sincronizarDadosInterno(context, true, opId);
      },
      error: () => {
        this.failOp(opId, 'Falha na verificação de dados');
      },
    });
  }

  private sincronizarDadosInterno(
    context: SyncDiagramContext,
    jaIniciado: boolean,
    existingOpId?: string
  ): void {
    const base = context.base;
    const esquema = context.esquema;
    if (!base || !esquema) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Seleção incompleta',
        detail: 'Selecione base e schema.',
      });
      return;
    }

    const opId =
      existingOpId ?? this.operations.createOperation('dados', 'sincronizar', context);

    if (!jaIniciado) {
      this.progressoSync.iniciarGenericoProgressoLocal();
    } else if (!existingOpId) {
      this.operations.beginSyncPhase(opId);
    }

    this.baseService.findAll(`dados/${base}/${esquema}`).subscribe({
      next: (res: { errors?: string[]; tabelas_afetadas?: TabelaAfetadaDTO[] }) => {
        if (res?.errors?.length) {
          this.operations.completeSync(opId, { errors: res.errors, tabelas_afetadas: res.tabelas_afetadas });
          this.progressoSync.marcarErro('Sincronização de dados com erros');
          return;
        }
        this.operations.completeSync(opId, {
          tabelas_afetadas: res.tabelas_afetadas,
          errors: res.errors,
        });
        this.messageService.add({
          severity: 'success',
          summary: 'Dados sincronizados',
          detail: `${base}.${esquema}`,
        });
      },
      error: () => {
        this.failOp(opId, 'Falha na sincronização de dados');
      },
    });
  }
}
