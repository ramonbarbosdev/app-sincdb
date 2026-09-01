import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ProgressoStatus = 'IDLE' | 'RUNNING' | 'CONCLUIDO' | 'ERRO' | 'CANCELADO';

export interface EstadoProgresso {
  progresso: number;
  mensagem: string | null;
  tabelaAtual: string | null;
  status: ProgressoStatus;
  resumo: string | null;
  duracaoMs: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class ProgressoSyncService {
  private progressoState = new BehaviorSubject<EstadoProgresso>({
    progresso: 0,
    mensagem: null,
    tabelaAtual: null,
    status: 'IDLE',
    resumo: null,
    duracaoMs: null,
  });

  progressoState$ = this.progressoState.asObservable();

  private normalizeStatus(raw: string | undefined | null): ProgressoStatus | null {
    if (!raw) return null;
    const normalized = raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();
    if (normalized === 'CONCLUIDO') return 'CONCLUIDO';
    if (normalized === 'CANCELADO') return 'CANCELADO';
    if (normalized === 'ERRO') return 'ERRO';
    if (
      normalized === 'RUNNING' ||
      normalized === 'EXECUTANDO' ||
      normalized === 'PROCESSANDO' ||
      normalized === 'INICIANDO'
    ) {
      return 'RUNNING';
    }
    if (normalized === 'IDLE') return 'IDLE';
    return null;
  }

  updateProgresso(data: any) {
    const normalizedStatus = this.normalizeStatus(data.status);
    const nextStatus: ProgressoStatus =
      normalizedStatus ??
      (data.progresso > 0 || data.mensagem
        ? 'RUNNING'
        : this.progressoState.value.status);

    this.progressoState.next({
      progresso: data.progresso ?? 0,
      mensagem: data.mensagem ?? null,
      tabelaAtual: data.tabelaAtual ?? null,
      status: data.status ? nextStatus : data.progresso > 0 ? 'RUNNING' : this.progressoState.value.status,
      resumo: data.resumo ?? this.progressoState.value.resumo,
      duracaoMs: data.duracaoMs ?? this.progressoState.value.duracaoMs,
    });

    if (
      normalizedStatus === 'CONCLUIDO' ||
      normalizedStatus === 'CANCELADO' ||
      normalizedStatus === 'ERRO'
    ) {
      setTimeout(() => this.resetar(), 2200);
    }
  }

  marcarConcluido(opts: { mensagem: string; resumo: string; duracaoMs: number }) {
    this.progressoState.next({
      progresso: 100,
      mensagem: opts.mensagem,
      tabelaAtual: null,
      status: 'CONCLUIDO',
      resumo: opts.resumo,
      duracaoMs: opts.duracaoMs,
    });

    setTimeout(() => this.resetar(), 2200);
  }

  marcarErro(mensagem = 'Sincronização interrompida') {
    this.progressoState.next({
      ...this.progressoState.value,
      mensagem,
      status: 'ERRO',
    });

    setTimeout(() => this.resetar(), 2200);
  }

  marcarCancelado(mensagem = 'Operação cancelada pelo usuário') {
    this.progressoState.next({
      progresso: 0,
      mensagem,
      tabelaAtual: null,
      status: 'CANCELADO',
      resumo: null,
      duracaoMs: null,
    });

    setTimeout(() => this.resetar(), 2200);
  }

  resetar() {
    this.progressoState.next({
      progresso: 0,
      mensagem: 'Aguardando...',
      tabelaAtual: null,
      status: 'IDLE',
      resumo: null,
      duracaoMs: null,
    });
  }

  vazioProgressoLocal() {
    this.progressoState.next({
      progresso: 0,
      mensagem: 'Pronto para iniciar uma nova sincronização!',
      tabelaAtual: null,
      status: 'IDLE',
      resumo: null,
      duracaoMs: null,
    });
  }

  verificacaoConcluidaProgressoLocal() {
    this.updateProgresso({
      progresso: 100,
      mensagem: 'Verificação concluída!',
      tabelaAtual: null,
      status: 'RUNNING',
    });
  }

  sincronizacaoConcluidaProgressoLocal() {
    this.marcarConcluido({
      mensagem: 'Sincronização concluída!',
      resumo: '',
      duracaoMs: 0,
    });
  }

  iniciarGenericoProgressoLocal() {
    this.progressoState.next({
      progresso: 0,
      mensagem: 'Iniciando...',
      tabelaAtual: null,
      status: 'RUNNING',
      resumo: null,
      duracaoMs: null,
    });
  }

  finalizarProgressoLocal() {
    this.updateProgresso({
      progresso: 0,
      mensagem: 'Finalizado!',
      tabelaAtual: null,
    });
  }

  atualizarMensagem(msg: string) {
    this.updateProgresso({
      progresso: this.progressoState.value.progresso,
      mensagem: msg,
      tabelaAtual: this.progressoState.value.tabelaAtual,
    });
  }
}
