export { };

declare global {
  interface Window {
    updater: {
      onUpdateAvailable: (cb: (data?: {
        currentVersion?: string;
        version?: string;
        availableVersion?: string;
      }) => void) => void;
      onProgress: (cb: (data: { percent: number }) => void) => void;
      onDownloaded: (cb: () => void) => void;
      onError: (cb: (message: string) => void) => void;
      startDownload: () => void | Promise<void>;
      installUpdate: () => void | Promise<void>;
      openLatestRelease: () => void | Promise<void>;
      checkForUpdates: () => void | Promise<void>;
    };
  }
}
