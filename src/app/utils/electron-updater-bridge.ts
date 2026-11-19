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

function isUpdaterBridge(value: unknown): value is ElectronUpdaterBridge {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const bridge = value as ElectronUpdaterBridge;
  return (
    typeof bridge.checkForUpdates === 'function' &&
    typeof bridge.onUpdateNotAvailable === 'function'
  );
}

export function isElectronShell(): boolean {
  return typeof window !== 'undefined' && typeof window.platform === 'string';
}

export function resolveUpdaterBridge(): ElectronUpdaterBridge | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (isUpdaterBridge(window.updater)) {
    return window.updater;
  }

  const desktop = window.desktop as
    | (Window['desktop'] & { updater?: ElectronUpdaterBridge })
    | undefined;

  if (isUpdaterBridge(desktop?.updater)) {
    return desktop!.updater!;
  }

  if (isUpdaterBridge(desktop)) {
    return desktop!;
  }

  return null;
}