export {};

declare global {
  interface Window {
    desktop?: {
      showNotification: (payload: {
        title?: string;
        body: string;
        silent?: boolean;
      }) => Promise<{ ok: boolean; reason?: string }>;
    };
  }
}
