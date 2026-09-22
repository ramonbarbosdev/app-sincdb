import { Injectable, inject } from '@angular/core';
import { DesktopNotificationKind } from '../models/desktop-notification-settings';
import { DesktopNotificationSettingsService } from './desktop-notification-settings.service';

@Injectable({
  providedIn: 'root',
})
export class DesktopNotificationService {
  private settings = inject(DesktopNotificationSettingsService);

  isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.desktop?.showNotification;
  }

  shouldShowForContext(): boolean {
    if (!this.settings.shouldNotifyWhenUnfocusedOnly()) {
      return true;
    }
    return document.hidden || !document.hasFocus();
  }

  async show(
    body: string,
    title = 'SyncDB Desktop',
    kind?: DesktopNotificationKind,
    options?: { bypassFocusCheck?: boolean }
  ): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    if (!this.settings.getPreferences().enabled) {
      return false;
    }

    if (kind && !this.settings.isKindEnabled(kind)) {
      return false;
    }

    if (!options?.bypassFocusCheck && !this.shouldShowForContext()) {
      return false;
    }

    const result = await window.desktop!.showNotification({ title, body });
    return result.ok;
  }
}
