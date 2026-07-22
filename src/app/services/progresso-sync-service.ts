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

  updateProgresso(data: any) {
    const nextStatus: ProgressoStatus =
      data.status === 'CONCLUIDO'
        ? 'CONCLUIDO'
        : data.status === 'CANCELADO'
          ? 'CANCELADO'
          : data.status === 'ERRO'
            ? 'ERRO'
            : data.progresso > 0 || data.mensagem
              ? 'RUNNING'
              : this.progressoState.value.status;

    this.progressoState.next({
      progresso: data.progresso ?? 0,
      mensagem: data.mensagem ?? null,
      tabelaAtual: data.tabelaAtual ?? null,
      status: data.status ? nextStatus : data.progresso > 0 ? 'RUNNING' : this.progressoState.value.status,
      resumo: data.resumo ?? this.progressoState.value.resumo,
      duracaoMs: data.duracaoMs ?? this.progressoState.value.duracaoMs,
    });

    if (data.status === 'CONCLUIDO' || data.status === 'CANCELADO') {
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
