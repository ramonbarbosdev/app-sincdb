export type DesktopNotificationKind = 'syncSuccess' | 'syncError' | 'updateReady';

export interface DesktopNotificationPreferences {
  enabled: boolean;
  syncSuccess: boolean;
  syncError: boolean;
  updateReady: boolean;
  onlyWhenUnfocused: boolean;
}

export const DEFAULT_DESKTOP_NOTIFICATION_PREFERENCES: DesktopNotificationPreferences =
  {
    enabled: true,
    syncSuccess: true,
    syncError: true,
    updateReady: true,
    onlyWhenUnfocused: true,
  };

export const DESKTOP_NOTIFICATION_PREFS_KEY = 'syncdb-desktop-notification-prefs';
