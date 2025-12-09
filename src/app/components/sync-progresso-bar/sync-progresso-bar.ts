import { Component, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { WebsocketService } from '../../services/websocket.service';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressoSyncService } from '../../services/progresso-sync-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-sync-progresso-bar',
  imports: [ProgressBarModule, CommonModule, FormsModule],
  templateUrl: './sync-progresso-bar.html',
  styleUrl: './sync-progresso-bar.scss',
})
export class SyncProgressoBar {
  progresso = 0;
  mensagem: string | null = 'Aguardando...';
  tabelaAtual: string | null = null;
  status: string = 'PENDENTE';

  private socketSub!: Subscription;
  private progressoSub!: Subscription;

  private progressoSync = inject(ProgressoSyncService);
  private websocketService = inject(WebsocketService);

  ngOnInit() {
    this.socketSub = this.websocketService.progresso$.subscribe((res) => {
      this.progressoSync.updateProgresso(res);
    });

    this.progressoSub = this.progressoSync.progressoState$.subscribe((res) => {
      this.progresso = res.progresso;
      this.mensagem = res.mensagem;
      this.tabelaAtual = res.tabelaAtual;
    });
  }



  ngOnDestroy() {
    this.socketSub?.unsubscribe();
    this.progressoSub?.unsubscribe();
  }
}
