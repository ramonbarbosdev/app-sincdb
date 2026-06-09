export { };

declare global {
  interface Window {
    updater: {
      onUpdateAvailable: (cb: () => void) => void;
      onProgress: (cb: (data: { percent: number }) => void) => void;
      onDownloaded: (cb: () => void) => void;
      onError: (cb: (message: string) => void) => void;
      startDownload: () => void | Promise<void>;
      installUpdate: () => void | Promise<void>;
      checkForUpdates: () => void | Promise<void>;
    };
  }
}
