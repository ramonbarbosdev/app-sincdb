export {};

declare global {
  interface Window {
    desktop?: {
      backendPort?: number;
      apiBaseUrl?: string;
      apiWebSocketUrl?: string;
      showNotification: (payload: {
        title?: string;
        body: string;
        silent?: boolean;
      }) => Promise<{ ok: boolean; reason?: string }>;
    };
  }
}
