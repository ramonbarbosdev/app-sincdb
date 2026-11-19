import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ElectronUpdaterBridge,
  isBrowserAccessingDesktopBuild,
  isElectronShell,
  isRunningInElectron,
  ManualUpdateCheckResult,
  resolveCheckForUpdates,
  resolveUpdaterBridge,
  UpdateAvailablePayload,
} from '../utils/electron-updater-bridge';
import { SYNCDB_DOWNLOAD_SITE_URL } from '../constants/syncdb-urls';

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
  private aboutOpen$ = new BehaviorSubject<boolean>(false);

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
  aboutOpen = this.aboutOpen$.asObservable();

  get isUpdaterAvailable(): boolean {
    return !!resolveUpdaterBridge();
  }

  get isDesktopShell(): boolean {
    return isElectronShell();
  }

  get installedVersion(): string {
    const version = window.desktop?.appVersion;
    if (version) {
      return version;
    }
    return environment.production ? '-' : 'dev';
  }

  openAbout(): void {
    this.aboutOpen$.next(true);
  }

  closeAbout(): void {
    this.aboutOpen$.next(false);
  }

  private manualCheckPending = false;
  private eventsBoundBridge: ElectronUpdaterBridge | null = null;
  private previewProgressTimer: ReturnType<typeof setInterval> | null = null;

  private readonly previewVersionInfo: UpdateVersionInfo = {
    currentVersion: '1.2.16',
    availableVersion: '1.2.17',
  };

  constructor() {
    this.ensureUpdaterBridge();
  }

  private ensureUpdaterBridge(): ElectronUpdaterBridge | null {
    const bridge = resolveUpdaterBridge();
    if (!bridge) {
      return null;
    }

    if (this.eventsBoundBridge !== bridge) {
      this.listenElectronEvents(bridge);
      this.eventsBoundBridge = bridge;
      bridge.notifyRendererReady?.();
    }

    return bridge;
  }

  private listenElectronEvents(updater: ElectronUpdaterBridge) {
    const onAvailable = (data?: UpdateAvailablePayload) => {
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

    updater.onUpdateAvailable?.(onAvailable);
    updater.onManualUpdateAvailable?.(onAvailable);

    updater.onUpdateNotAvailable?.(() => {
      this.checking$.next(false);
      this.resetActiveUpdateState();
      if (this.manualCheckPending) {
        this.updateNotAvailable$.next(true);
      }
      this.manualCheckPending = false;
    });

    updater.onProgress?.((data) => {
      this.checking$.next(false);
      this.updateAvailable$.next(false);
      this.downloading$.next(true);
      this.progress$.next(data.percent);
    });

    updater.onDownloaded?.(() => {
      this.checking$.next(false);
      this.updateAvailable$.next(false);
      this.downloading$.next(false);
      this.downloaded$.next(true);
    });

    updater.onError?.((message) => {
      this.checking$.next(false);
      this.downloading$.next(false);
      this.fallbackUrl$.next(SYNCDB_DOWNLOAD_SITE_URL);
      this.error$.next(message);
    });

    updater.onInstallFailed?.((data) => {
      this.checking$.next(false);
      this.downloading$.next(false);
      this.installFailed$.next(true);
      this.error$.next(data?.message ?? 'Falha ao instalar a atualizacao.');
      this.fallbackUrl$.next(data?.fallbackUrl ?? SYNCDB_DOWNLOAD_SITE_URL);
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
    const desktop = window.desktop as { openLatestRelease?: () => Promise<void> } | undefined;
    if (desktop?.openLatestRelease) {
      desktop.openLatestRelease().catch(() => this.openDownloadSiteInBrowser());
      return;
    }

    const bridge = resolveUpdaterBridge();
    if (bridge) {
      this.runUpdaterAction('Nao foi possivel abrir a pagina da ultima release.', (updater) =>
        updater.openLatestRelease()
      );
      return;
    }

    this.openDownloadSiteInBrowser();
  }

  checkForUpdates() {
    this.closeAbout();

    this.ensureUpdaterBridge();
    const checkForUpdates = resolveCheckForUpdates();

    if (!checkForUpdates) {
      this.checking$.next(false);
      this.fallbackUrl$.next(SYNCDB_DOWNLOAD_SITE_URL);
      this.installFailed$.next(false);
      this.error$.next(this.updaterUnavailableMessage());
      return;
    }

    this.resetState();
    this.manualCheckPending = true;
    this.checking$.next(true);

    try {
      const result = checkForUpdates();
      if (result instanceof Promise) {
        result
          .then((payload) => this.applyManualCheckResult(payload))
          .catch((error) => {
            this.manualCheckPending = false;
            this.checking$.next(false);
            this.fallbackUrl$.next(SYNCDB_DOWNLOAD_SITE_URL);
            this.error$.next(
              this.normalizeError(error, 'Nao foi possivel verificar atualizacoes.')
            );
          });
      }
    } catch (error) {
      this.manualCheckPending = false;
      this.checking$.next(false);
      this.fallbackUrl$.next(SYNCDB_DOWNLOAD_SITE_URL);
      this.error$.next(this.normalizeError(error, 'Nao foi possivel verificar atualizacoes.'));
    }
  }

  private applyManualCheckResult(payload: ManualUpdateCheckResult | void | undefined): void {
    if (!payload || !this.manualCheckPending) {
      return;
    }

    if (payload.status === 'not-available') {
      this.manualCheckPending = false;
      this.checking$.next(false);
      this.updateNotAvailable$.next(true);
      return;
    }

    if (payload.status === 'available') {
      this.manualCheckPending = false;
      this.checking$.next(false);
      this.versionInfo$.next({
        currentVersion: payload.currentVersion || this.installedVersion,
        availableVersion: payload.latestVersion || '-',
      });
      this.updateAvailable$.next(true);
      return;
    }

    if (payload.status === 'dev') {
      this.manualCheckPending = false;
      this.checking$.next(false);
      this.updateNotAvailable$.next(true);
      return;
    }

    if (payload.status === 'error') {
      this.manualCheckPending = false;
      this.checking$.next(false);
      this.fallbackUrl$.next(SYNCDB_DOWNLOAD_SITE_URL);
      this.error$.next(payload.message || 'Nao foi possivel verificar atualizacoes.');
    }
  }

  private updaterUnavailableMessage(): string {
    if (isBrowserAccessingDesktopBuild()) {
      return 'Abra o SyncDB pela janela do aplicativo (icone SyncDB ou npm start), nao pelo navegador em localhost.';
    }

    if (isRunningInElectron()) {
      return 'A integracao com o atualizador falhou ao iniciar. Feche o SyncDB e abra de novo (npm start ou o atalho instalado).';
    }

    if (isElectronShell()) {
      return 'O atualizador automatico nao esta disponivel nesta instalacao. Baixe o instalador em syncdb.ramoncode.com.br e instale por cima.';
    }

    return 'Baixe a versao mais recente em syncdb.ramoncode.com.br.';
  }

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
        this.fallbackUrl$.next(SYNCDB_DOWNLOAD_SITE_URL);
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
    action: (updater: ElectronUpdaterBridge) => void | Promise<void>
  ) {
    const updater = resolveUpdaterBridge();
    if (!updater) {
      this.checking$.next(false);
      this.fallbackUrl$.next(SYNCDB_DOWNLOAD_SITE_URL);
      this.error$.next(this.updaterUnavailableMessage());
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

  private openDownloadSiteInBrowser(): void {
    const url = this.fallbackUrl$.value ?? SYNCDB_DOWNLOAD_SITE_URL;
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}