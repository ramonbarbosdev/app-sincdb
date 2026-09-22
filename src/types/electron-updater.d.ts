export {};

export interface UpdateInstallFailedPayload {
  message: string;
  fallbackUrl?: string;
}

declare global {
  interface Window {
    updater?: {
      onUpdateAvailable: (cb: (data?: {
        currentVersion?: string;
        version?: string;
        availableVersion?: string;
        latestVersion?: string;
        platform?: string;
        mode?: string;
      }) => void) => void;
      onManualUpdateAvailable: (cb: (data?: {
        currentVersion?: string;
        latestVersion?: string;
        version?: string;
        availableVersion?: string;
      }) => void) => void;
      onUpdateNotAvailable: (cb: () => void) => void;
      onProgress: (cb: (data: { percent: number }) => void) => void;
      onDownloaded: (cb: () => void) => void;
      onError: (cb: (message: string) => void) => void;
      onInstallFailed: (cb: (data: UpdateInstallFailedPayload) => void) => void;
      startDownload: () => void | Promise<void>;
      installUpdate: () => void | Promise<void>;
      openLatestRelease: () => void | Promise<void>;
      checkForUpdates: () => void | Promise<void>;
    };
  }
}
