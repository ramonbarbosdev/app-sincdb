import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UpdateService {

  private updateAvailable$ = new BehaviorSubject<boolean>(false);
  private downloading$ = new BehaviorSubject<boolean>(false);
  private progress$ = new BehaviorSubject<number>(0);
  private downloaded$ = new BehaviorSubject<boolean>(false);
  private error$ = new BehaviorSubject<string | null>(null);

  // exposições públicas
  updateAvailable = this.updateAvailable$.asObservable();
  downloading = this.downloading$.asObservable();
  progress = this.progress$.asObservable();
  downloaded = this.downloaded$.asObservable();
  error = this.error$.asObservable();

  constructor() {
    if (window.updater) {
      this.listenElectronEvents();
    }
  }

  private listenElectronEvents() {

    window.updater.onUpdateAvailable(() => {
      this.resetState();
      this.updateAvailable$.next(true);
    });

    window.updater.onProgress((data) => {
      this.downloading$.next(true);
      this.progress$.next(data.percent);
    });

    window.updater.onDownloaded(() => {
      this.downloading$.next(false);
      this.downloaded$.next(true);
    });

    window.updater.onError((message) => {
      this.downloading$.next(false);
      this.error$.next(message);
    });
  }

  /** Usuário clicou em "Atualizar agora" */
  startUpdate() {
    window.updater.startDownload();
  }

  /** Usuário clicou em "Instalar e reiniciar" */
  installUpdate() {
    window.updater.installUpdate();
  }

  /** Usuário clicou em "Verificar atualizações" */
  checkForUpdates() {
    this.resetState();
    window.updater.checkForUpdates();
  }

  /** Reset seguro de estado */
  private resetState() {
    this.updateAvailable$.next(false);
    this.downloading$.next(false);
    this.downloaded$.next(false);
    this.progress$.next(0);
    this.error$.next(null);
  }
}
