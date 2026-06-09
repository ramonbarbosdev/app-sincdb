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

  updateAvailable = this.updateAvailable$.asObservable();
  downloading = this.downloading$.asObservable();
  progress = this.progress$.asObservable();
  downloaded = this.downloaded$.asObservable();
  error = this.error$.asObservable();

  constructor() {
    if (window.updater) {
      this.listenElectronEvents();
    } else {
      this.error$.next('Atualizador indisponivel nesta execucao do aplicativo.');
    }
  }

  private listenElectronEvents() {
    window.updater.onUpdateAvailable(() => {
      this.resetState();
      this.updateAvailable$.next(true);
    });

    window.updater.onProgress((data) => {
      this.updateAvailable$.next(false);
      this.downloading$.next(true);
      this.progress$.next(data.percent);
    });

    window.updater.onDownloaded(() => {
      this.updateAvailable$.next(false);
      this.downloading$.next(false);
      this.downloaded$.next(true);
    });

    window.updater.onError((message) => {
      this.downloading$.next(false);
      this.error$.next(message);
    });
  }

  startUpdate() {
    this.runUpdaterAction('Nao foi possivel iniciar o download da atualizacao.', () =>
      window.updater.startDownload()
    );
  }

  installUpdate() {
    this.runUpdaterAction('Nao foi possivel instalar a atualizacao.', () =>
      window.updater.installUpdate()
    );
  }

  checkForUpdates() {
    this.resetState();
    this.runUpdaterAction('Nao foi possivel verificar atualizacoes.', () =>
      window.updater.checkForUpdates()
    );
  }

  private resetState() {
    this.updateAvailable$.next(false);
    this.downloading$.next(false);
    this.downloaded$.next(false);
    this.progress$.next(0);
    this.error$.next(null);
  }

  private runUpdaterAction(message: string, action: () => void | Promise<void>) {
    if (!window.updater) {
      this.error$.next('Atualizador indisponivel nesta execucao do aplicativo.');
      return;
    }

    try {
      const result = action();

      if (result instanceof Promise) {
        result.catch((error) => this.error$.next(this.normalizeError(error, message)));
      }
    } catch (error) {
      this.error$.next(this.normalizeError(error, message));
    }
  }

  private normalizeError(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === 'string' && error.trim()) {
      return error;
    }

    return fallback;
  }
}
