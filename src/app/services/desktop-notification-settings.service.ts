import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  DEFAULT_DESKTOP_NOTIFICATION_PREFERENCES,
  DESKTOP_NOTIFICATION_PREFS_KEY,
  DesktopNotificationKind,
  DesktopNotificationPreferences,
} from '../models/desktop-notification-settings';
import { isDesktopApp } from '../utils/platform-storage';

@Injectable({
  providedIn: 'root',
})
export class DesktopNotificationSettingsService {
  private readonly prefs$ = new BehaviorSubject<DesktopNotificationPreferences>(
    this.load()
  );

  readonly preferences$ = this.prefs$.asObservable();

  getPreferences(): DesktopNotificationPreferences {
    return this.prefs$.value;
  }

  isKindEnabled(kind: DesktopNotificationKind): boolean {
    if (!isDesktopApp()) {
      return false;
    }

    const prefs = this.prefs$.value;
    if (!prefs.enabled) {
      return false;
    }

    switch (kind) {
      case 'syncSuccess':
        return prefs.syncSuccess;
      case 'syncError':
        return prefs.syncError;
      case 'updateReady':
        return prefs.updateReady;
      default:
        return false;
    }
  }

  shouldNotifyWhenUnfocusedOnly(): boolean {
    return this.prefs$.value.onlyWhenUnfocused;
  }

  updatePreferences(patch: Partial<DesktopNotificationPreferences>): void {
    const next = { ...this.prefs$.value, ...patch };
    this.prefs$.next(next);
    localStorage.setItem(DESKTOP_NOTIFICATION_PREFS_KEY, JSON.stringify(next));
  }

  private load(): DesktopNotificationPreferences {
    try {
      const raw = localStorage.getItem(DESKTOP_NOTIFICATION_PREFS_KEY);
      if (!raw) {
        return { ...DEFAULT_DESKTOP_NOTIFICATION_PREFERENCES };
      }
      const parsed = JSON.parse(raw) as Partial<DesktopNotificationPreferences>;
      return {
        ...DEFAULT_DESKTOP_NOTIFICATION_PREFERENCES,
        ...parsed,
      };
    } catch {
      return { ...DEFAULT_DESKTOP_NOTIFICATION_PREFERENCES };
    }
  }
}
