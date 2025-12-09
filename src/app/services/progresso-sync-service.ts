import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';


interface EstadoProgresso {
  progresso: number;
  mensagem: string | null;
  tabelaAtual: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ProgressoSyncService {
  private progressoState = new BehaviorSubject<EstadoProgresso>({
    progresso: 0,
    mensagem: null,
    tabelaAtual: null,
  });

  progressoState$ = this.progressoState.asObservable();

  updateProgresso(data: any) {
    this.progressoState.next({
      progresso: data.progresso ?? 0,
      mensagem: data.mensagem ?? null,
      tabelaAtual: data.tabelaAtual ?? null,
    });

    // Reset automático se finalizar ou cancelar
    if (data.status === 'CONCLUIDO' || data.status === 'CANCELADO') {
      setTimeout(() => this.resetar(), 1500);
    }
  }

  resetar() {
    this.progressoState.next({
      progresso: 0,
      mensagem: 'Cancelado',
      tabelaAtual: null,
    });
  }

  vazioProgressoLocal() {
    this.updateProgresso({
      progresso: 0,
      mensagem: 'Pronto para iniciar uma nova sincronização!',
      tabelaAtual: null,
    });
  }

  verificacaoConcluidaProgressoLocal() {
    this.updateProgresso({
      progresso: 100,
      mensagem: 'Verificação concluida!',
      tabelaAtual: null,
      status: 'PROCESSANDO',
    });
  }

  sincronizacaoConcluidaProgressoLocal() {
    this.updateProgresso({
      progresso: 100,
      mensagem: 'Sincronização concluida!',
      tabelaAtual: null,
      status: 'PROCESSANDO',
    });
  }

  iniciarGenericoProgressoLocal() {
    this.updateProgresso({
      progresso: 0,
      mensagem: 'Iniciando...',
      tabelaAtual: null,
    });
  }
  finalizarProgressoLocal() {
    this.updateProgresso({
      progresso: 0,
      mensagem: 'Finalizado!',
      tabelaAtual: null,
    });
  }
  atualizarMensagem(msg:string) {
    this.updateProgresso({
      progresso: 0,
      mensagem: msg,
      tabelaAtual: null,
    });
  }
}
