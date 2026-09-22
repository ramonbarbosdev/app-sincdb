import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UpdateVersionInfo {
  currentVersion: string;
  availableVersion: string;
}

export type UpdateUiPreviewScenario =
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'not-available'
  | 'error'
  | 'install-failed';

@Injectable({
  providedIn: 'root',
})
export class UpdateService {
  private updateAvailable$ = new BehaviorSubject<boolean>(false);
  private versionInfo$ = new BehaviorSubject<UpdateVersionInfo>({
    currentVersion: '-',
    availableVersion: '-',
  });
  private downloading$ = new BehaviorSubject<boolean>(false);
  private progress$ = new BehaviorSubject<number>(0);
  private downloaded$ = new BehaviorSubject<boolean>(false);
  private error$ = new BehaviorSubject<string | null>(null);
  private updateNotAvailable$ = new BehaviorSubject<boolean>(false);
  private installFailed$ = new BehaviorSubject<boolean>(false);
  private fallbackUrl$ = new BehaviorSubject<string | null>(null);
  private checking$ = new BehaviorSubject<boolean>(false);

  updateAvailable = this.updateAvailable$.asObservable();
  versionInfo = this.versionInfo$.asObservable();
  downloading = this.downloading$.asObservable();
  progress = this.progress$.asObservable();
  downloaded = this.downloaded$.asObservable();
  error = this.error$.asObservable();
  updateNotAvailable = this.updateNotAvailable$.asObservable();
  installFailed = this.installFailed$.asObservable();
  fallbackUrl = this.fallbackUrl$.asObservable();
  checking = this.checking$.asObservable();

  get isUpdaterAvailable(): boolean {
    return !!window.updater;
  }

  private manualCheckPending = false;
  private previewProgressTimer: ReturnType<typeof setInterval> | null = null;

  private readonly previewVersionInfo: UpdateVersionInfo = {
    currentVersion: '1.2.16',
    availableVersion: '1.2.17',
  };

  constructor() {
    if (window.updater) {
      this.listenElectronEvents();
    }
  }

  private listenElectronEvents() {
    const updater = window.updater;
    if (!updater) {
      return;
    }

    const onAvailable = (data?: {
      currentVersion?: string;
      version?: string;
      availableVersion?: string;
      latestVersion?: string;
    }) => {
      this.manualCheckPending = false;
      this.checking$.next(false);
      this.updateNotAvailable$.next(false);
      this.installFailed$.next(false);
      this.error$.next(null);
      this.versionInfo$.next({
        currentVersion: data?.currentVersion || '-',
        availableVersion:
          data?.version || data?.availableVersion || data?.latestVersion || '-',
      });
      this.updateAvailable$.next(true);
    };

    updater.onUpdateAvailable(onAvailable);

    updater.onManualUpdateAvailable(onAvailable);

    updater.onUpdateNotAvailable(() => {
      this.checking$.next(false);
      this.resetActiveUpdateState();
      if (this.manualCheckPending) {
        this.updateNotAvailable$.next(true);
      }
      this.manualCheckPending = false;
    });

    updater.onProgress((data) => {
      this.checking$.next(false);
      this.updateAvailable$.next(false);
      this.downloading$.next(true);
      this.progress$.next(data.percent);
    });

    updater.onDownloaded(() => {
      this.checking$.next(false);
      this.updateAvailable$.next(false);
      this.downloading$.next(false);
      this.downloaded$.next(true);
    });

    updater.onError((message) => {
      this.checking$.next(false);
      this.downloading$.next(false);
      this.error$.next(message);
    });

    updater.onInstallFailed((data) => {
      this.checking$.next(false);
      this.downloading$.next(false);
      this.installFailed$.next(true);
      this.error$.next(data?.message ?? 'Falha ao instalar a atualizacao.');
      this.fallbackUrl$.next(data?.fallbackUrl ?? null);
    });
  }

  startUpdate() {
    this.error$.next(null);
    this.installFailed$.next(false);
    this.runUpdaterAction('Nao foi possivel iniciar o download da atualizacao.', (updater) =>
      updater.startDownload()
    );
  }

  installUpdate() {
    this.runUpdaterAction('Nao foi possivel instalar a atualizacao.', (updater) =>
      updater.installUpdate()
    );
  }

  openLatestRelease() {
    this.runUpdaterAction('Nao foi possivel abrir a pagina da ultima release.', (updater) =>
      updater.openLatestRelease()
    );
  }

  checkForUpdates() {
    if (!this.isUpdaterAvailable) {
      this.error$.next('Atualizador indisponivel nesta execucao do aplicativo.');
      return;
    }

    this.resetState();
    this.manualCheckPending = true;
    this.checking$.next(true);
    this.runUpdaterAction('Nao foi possivel verificar atualizacoes.', (updater) =>
      updater.checkForUpdates()
    );
  }

  /** Somente desenvolvimento: simula estados do dialogo de atualizacao. */
  simulateUiPreview(scenario: UpdateUiPreviewScenario): void {
    if (environment.production) {
      return;
    }

    this.clearPreviewTimers();
    this.resetState();

    switch (scenario) {
      case 'checking':
        this.checking$.next(true);
        break;
      case 'available':
        this.versionInfo$.next(this.previewVersionInfo);
        this.updateAvailable$.next(true);
        break;
      case 'downloading':
        this.downloading$.next(true);
        this.progress$.next(0);
        this.previewProgressTimer = setInterval(() => {
          const next = Math.min(100, this.progress$.value + 6);
          this.progress$.next(next);
          if (next >= 100) {
            this.clearPreviewTimers();
          }
        }, 180);
        break;
      case 'downloaded':
        this.versionInfo$.next(this.previewVersionInfo);
        this.downloaded$.next(true);
        break;
      case 'not-available':
        this.updateNotAvailable$.next(true);
        break;
      case 'error':
        this.error$.next(
          'Cannot find latest.yml in the latest release artifacts (simulacao de erro).'
        );
        break;
      case 'install-failed':
        this.installFailed$.next(true);
        this.error$.next('Nao foi possivel executar quitAndInstall (simulacao).');
        this.fallbackUrl$.next('https://github.com/ramonbarbosdev/syncdb-desktop/releases/latest');
        break;
    }
  }

  simulateUiPreviewFlow(): void {
    if (environment.production) {
      return;
    }

    this.clearPreviewTimers();
    this.resetState();
    this.checking$.next(true);

    setTimeout(() => {
      this.resetState();
      this.versionInfo$.next(this.previewVersionInfo);
      this.updateAvailable$.next(true);
    }, 900);
  }

  clearUiPreview(): void {
    if (environment.production) {
      return;
    }

    this.clearPreviewTimers();
    this.resetState();
  }

  private clearPreviewTimers(): void {
    if (this.previewProgressTimer) {
      clearInterval(this.previewProgressTimer);
      this.previewProgressTimer = null;
    }
  }

  private resetActiveUpdateState() {
    this.updateAvailable$.next(false);
    this.downloading$.next(false);
    this.downloaded$.next(false);
    this.progress$.next(0);
    this.error$.next(null);
    this.installFailed$.next(false);
    this.fallbackUrl$.next(null);
  }

  private resetState() {
    this.resetActiveUpdateState();
    this.updateNotAvailable$.next(false);
    this.checking$.next(false);
  }

  private runUpdaterAction(
    message: string,
    action: (updater: NonNullable<Window['updater']>) => void | Promise<void>
  ) {
    const updater = window.updater;
    if (!updater) {
      this.checking$.next(false);
      this.error$.next('Atualizador indisponivel nesta execucao do aplicativo.');
      return;
    }

    try {
      const result = action(updater);

      if (result instanceof Promise) {
        result.catch((error) => {
          this.checking$.next(false);
          this.error$.next(this.normalizeError(error, message));
        });
      }
    } catch (error) {
      this.checking$.next(false);
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
