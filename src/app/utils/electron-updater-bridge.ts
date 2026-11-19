import { environment } from '../../environments/environment';

export interface UpdateAvailablePayload {
  currentVersion?: string;
  version?: string;
  availableVersion?: string;
  latestVersion?: string;
}

export type ManualUpdateCheckResult = {
  status: 'available' | 'not-available' | 'dev' | 'error' | 'skipped';
  currentVersion?: string;
  latestVersion?: string;
  message?: string;
};

export interface ElectronUpdaterBridge {
  onUpdateAvailable: (cb: (data?: UpdateAvailablePayload) => void) => void;
  onManualUpdateAvailable: (cb: (data?: UpdateAvailablePayload) => void) => void;
  onUpdateNotAvailable: (cb: () => void) => void;
  onProgress: (cb: (data: { percent: number }) => void) => void;
  onDownloaded: (cb: () => void) => void;
  onError: (cb: (message: string) => void) => void;
  onInstallFailed: (cb: (data: { message: string; fallbackUrl?: string }) => void) => void;
  startDownload: () => void | Promise<void>;
  installUpdate: () => void | Promise<void>;
  openLatestRelease: () => void | Promise<void>;
  checkForUpdates: () => void | Promise<ManualUpdateCheckResult | void>;
  notifyRendererReady?: () => void | Promise<void>;
}

type UpdaterHost = {
  checkForUpdates?: () => void | Promise<ManualUpdateCheckResult | void>;
  onUpdateNotAvailable?: (cb: () => void) => void;
  onUpdateAvailable?: (cb: (data?: UpdateAvailablePayload) => void) => void;
  onManualUpdateAvailable?: (cb: (data?: UpdateAvailablePayload) => void) => void;
  onProgress?: (cb: (data: { percent: number }) => void) => void;
  onDownloaded?: (cb: () => void) => void;
  onError?: (cb: (message: string) => void) => void;
  onInstallFailed?: (cb: (data: { message: string; fallbackUrl?: string }) => void) => void;
  startDownload?: () => void | Promise<void>;
  installUpdate?: () => void | Promise<void>;
  openLatestRelease?: () => void | Promise<void>;
  notifyRendererReady?: () => void | Promise<void>;
};

function hostHasCheck(host: UpdaterHost | null | undefined): host is UpdaterHost {
  return !!host && typeof host.checkForUpdates === 'function';
}

export function isRunningInElectron(): boolean {
  return typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent);
}

export function isElectronShell(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  if (isRunningInElectron()) {
    return true;
  }

  if (typeof window.platform === 'string') {
    return true;
  }

  if (window.desktop?.apiBaseUrl) {
    return true;
  }

  if ((window as { syncdbPreloadReady?: boolean }).syncdbPreloadReady) {
    return true;
  }

  return !!(environment as { electronDesktop?: boolean }).electronDesktop;
}

export function isBrowserAccessingDesktopBuild(): boolean {
  if (isRunningInElectron()) {
    return false;
  }

  return !!(environment as { electronDesktop?: boolean }).electronDesktop;
}

export function resolveUpdaterBridge(): ElectronUpdaterBridge | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const candidates: UpdaterHost[] = [];
  if (window.updater) {
    candidates.push(window.updater);
  }
  const desktop = window.desktop as UpdaterHost | undefined;
  if (desktop) {
    const nested = (desktop as { updater?: UpdaterHost }).updater;
    if (nested) {
      candidates.push(nested);
    }
    candidates.push(desktop);
  }

  for (const host of candidates) {
    if (!hostHasCheck(host)) {
      continue;
    }

    return {
      checkForUpdates: () => host.checkForUpdates!(),
      notifyRendererReady: host.notifyRendererReady
        ? () => host.notifyRendererReady!()
        : undefined,
      startDownload: () => host.startDownload?.() ?? Promise.resolve(),
      installUpdate: () => host.installUpdate?.() ?? Promise.resolve(),
      openLatestRelease: () => host.openLatestRelease?.() ?? Promise.resolve(),
      onUpdateAvailable: (cb) => host.onUpdateAvailable?.(cb),
      onManualUpdateAvailable: (cb) => host.onManualUpdateAvailable?.(cb),
      onUpdateNotAvailable: (cb) => host.onUpdateNotAvailable?.(() => cb()),
      onProgress: (cb) => host.onProgress?.(cb),
      onDownloaded: (cb) => host.onDownloaded?.(() => cb()),
      onError: (cb) => host.onError?.(cb),
      onInstallFailed: (cb) => host.onInstallFailed?.(cb),
    };
  }

  return null;
}

export function resolveCheckForUpdates(): (() => void | Promise<ManualUpdateCheckResult | void>) | null {
  const bridge = resolveUpdaterBridge();
  if (bridge) {
    return () => bridge.checkForUpdates();
  }

  const raw = window.updater?.checkForUpdates ?? window.desktop?.checkForUpdates;
  if (typeof raw === 'function') {
    return () => raw.call(window.updater ?? window.desktop);
  }

  return null;
}