import { Injectable, inject } from '@angular/core';
import { filter, pairwise } from 'rxjs';
import { ProgressoSyncService } from './progresso-sync-service';
import { DesktopNotificationService } from './desktop-notification.service';
import { UpdateService } from './update.service';
import { isDesktopApp } from '../utils/platform-storage';

@Injectable({
  providedIn: 'root',
})
export class DesktopNotificationEventsService {
  private progressoSync = inject(ProgressoSyncService);
  private desktopNotify = inject(DesktopNotificationService);
  private updateService = inject(UpdateService);

  constructor() {
    if (!isDesktopApp()) {
      return;
    }

    this.watchSyncProgress();
    this.watchUpdateDownloaded();
  }

  private watchSyncProgress(): void {
    this.progressoSync.progressoState$
      .pipe(
        pairwise(),
        filter(([prev, next]) => prev.status !== next.status)
      )
      .subscribe(([, next]) => {
        if (next.status === 'CONCLUIDO') {
          const detail = next.resumo || next.mensagem || 'Sincronização concluída.';
          void this.desktopNotify.show(detail, 'Sincronização concluída', 'syncSuccess');
          return;
        }

        if (next.status === 'ERRO') {
          const detail = next.mensagem || next.resumo || 'Sincronização interrompida.';
          void this.desktopNotify.show(detail, 'Erro na sincronização', 'syncError');
        }
      });
  }

  private watchUpdateDownloaded(): void {
    this.updateService.downloaded
      .pipe(pairwise(), filter(([prev, next]) => !prev && next))
      .subscribe(() => {
        void this.desktopNotify.show(
          'Uma nova versão foi baixada. Abra o SyncDB para instalar.',
          'Atualização pronta',
          'updateReady'
        );
      });
  }
}
