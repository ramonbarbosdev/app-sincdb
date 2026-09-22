export const AUTH_USER_STORAGE_KEY = 'user';

/** Electron expõe `platform` no preload; não depender só do updater. */
export function isDesktopApp(): boolean {
  return typeof window !== 'undefined' && typeof window.platform === 'string';
}

/** No Electron persiste entre reinícios; na web mantém sessionStorage. */
export function authStorage(): Storage {
  return isDesktopApp() ? localStorage : sessionStorage;
}

/** Migra sessão da mesma execução após atualização do desktop. */
export function migrateAuthUserToPersistentStorage(): void {
  if (!isDesktopApp()) {
    return;
  }

  if (localStorage.getItem(AUTH_USER_STORAGE_KEY)) {
    sessionStorage.removeItem(AUTH_USER_STORAGE_KEY);
    return;
  }

  const legacy = sessionStorage.getItem(AUTH_USER_STORAGE_KEY);
  if (!legacy) {
    return;
  }

  localStorage.setItem(AUTH_USER_STORAGE_KEY, legacy);
  sessionStorage.removeItem(AUTH_USER_STORAGE_KEY);
}
