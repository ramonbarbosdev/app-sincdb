import { environment } from '../../environments/environment';

/** Sobrescreve apiUrl com valores expostos pelo preload do Electron. */
export function applyDesktopApiUrlFromPreload(): void {
  const desktop = typeof window !== 'undefined' ? window.desktop : undefined;
  if (!desktop?.apiBaseUrl) {
    return;
  }

  environment.apiUrl = desktop.apiBaseUrl;
  if (desktop.apiWebSocketUrl) {
    environment.apiUrlWebSocket = desktop.apiWebSocketUrl;
  }
}
