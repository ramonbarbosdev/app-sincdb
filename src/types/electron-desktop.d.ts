export {};

declare global {
  interface Window {
    desktop?: {
      appVersion?: string;
      backendPort?: number;
      apiBaseUrl?: string;
      apiWebSocketUrl?: string;
      openLatestRelease?: () => void | Promise<void>;
      showNotification: (payload: {
        title?: string;
        body: string;
        silent?: boolean;
      }) => Promise<{ ok: boolean; reason?: string }>;
    };
  }
}
