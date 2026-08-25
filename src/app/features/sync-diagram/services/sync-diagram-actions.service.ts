import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { BaseService } from '../../../services/base.service';
import { ProgressoSyncService } from '../../../services/progresso-sync-service';
import { SyncDiagramContext, SyncDiagramMode } from '../models/sync-diagram.model';

@Injectable()
export class SyncDiagramActionsService {
  private baseService = inject(BaseService);
  private progressoSync = inject(ProgressoSyncService);
  private messageService = inject(MessageService);

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

  verificarEstrutura(context: SyncDiagramContext): void {
    const base = context.base;
    const esquema = context.esquema;
    const tabelaParam = this.resolveTabelaParam(context);
    if (!base || !esquema || !tabelaParam) return;

    this.progressoSync.iniciarGenericoProgressoLocal();

    this.baseService.findAll(`sincronizacao/verificaesquema/${base}/${esquema}`).subscribe({
      next: () => {
        this.baseService
          .findAll(`estrutura/verificar/${base}/${esquema}/${tabelaParam}`)
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Estrutura verificada',
                detail: `${base}.${esquema}`,
              });
            },
            error: () => this.progressoSync.marcarErro('Falha na verificação de estrutura'),
          });
      },
      error: () => this.progressoSync.marcarErro('Falha ao verificar esquema'),
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

    this.progressoSync.iniciarGenericoProgressoLocal();

    this.baseService.findAll(`estrutura/verificar/${base}/${esquema}/${tabelaParam}`).subscribe({
      next: () => this.sincronizarEstruturaInterno(context, true),
      error: () => this.progressoSync.marcarErro('Falha na verificação de estrutura'),
    });
  }

  private sincronizarEstruturaInterno(context: SyncDiagramContext, jaIniciado: boolean): void {
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

    if (!jaIniciado) {
      this.progressoSync.iniciarGenericoProgressoLocal();
    }

    this.baseService.findAll(`estrutura/${base}/${esquema}`).subscribe({
      next: (res: { errors?: unknown[] }) => {
        if (res?.errors?.length) {
          this.progressoSync.marcarErro('Sincronização de estrutura com erros');
          return;
        }
        this.messageService.add({
          severity: 'success',
          summary: 'Estrutura sincronizada',
          detail: `${base}.${esquema}`,
        });
      },
      error: () => this.progressoSync.marcarErro('Falha na sincronização de estrutura'),
    });
  }

  verificarDados(context: SyncDiagramContext): void {
    const base = context.base;
    const esquema = context.esquema;
    const tabelaParam = this.resolveTabelaParam(context);
    if (!base || !esquema || !tabelaParam) return;

    this.progressoSync.iniciarGenericoProgressoLocal();

    this.baseService.findAll(`sincronizacao/verificaesquema/${base}/${esquema}`).subscribe({
      next: () => {
        this.baseService
          .findAll(`dados/verificar/${base}/${esquema}/${tabelaParam}`)
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Dados verificados',
                detail: `${base}.${esquema}`,
              });
            },
            error: () => this.progressoSync.marcarErro('Falha na verificação de dados'),
          });
      },
      error: () => this.progressoSync.marcarErro('Falha ao verificar esquema'),
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

    this.progressoSync.iniciarGenericoProgressoLocal();

    this.baseService.findAll(`dados/verificar/${base}/${esquema}/${tabelaParam}`).subscribe({
      next: () => this.sincronizarDadosInterno(context, true),
      error: () => this.progressoSync.marcarErro('Falha na verificação de dados'),
    });
  }

  private sincronizarDadosInterno(context: SyncDiagramContext, jaIniciado: boolean): void {
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

    if (!jaIniciado) {
      this.progressoSync.iniciarGenericoProgressoLocal();
    }

    this.baseService.findAll(`dados/${base}/${esquema}`).subscribe({
      next: (res: { errors?: unknown[] }) => {
        if (res?.errors?.length) {
          this.progressoSync.marcarErro('Sincronização de dados com erros');
          return;
        }
        this.messageService.add({
          severity: 'success',
          summary: 'Dados sincronizados',
          detail: `${base}.${esquema}`,
        });
      },
      error: () => this.progressoSync.marcarErro('Falha na sincronização de dados'),
    });
  }
}
