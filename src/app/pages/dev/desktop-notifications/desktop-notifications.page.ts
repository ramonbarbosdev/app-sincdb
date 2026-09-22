import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { DesktopNotificationPreferences } from '../../../models/desktop-notification-settings';
import { DesktopNotificationSettingsService } from '../../../services/desktop-notification-settings.service';
import { DesktopNotificationService } from '../../../services/desktop-notification.service';
import { isDesktopApp } from '../../../utils/platform-storage';

@Component({
  selector: 'app-desktop-notifications',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ToggleSwitchModule,
  ],
  templateUrl: './desktop-notifications.page.html',
  styleUrl: './desktop-notifications.page.scss',
})
export class DesktopNotificationsPage implements OnInit, OnDestroy {
  private settings = inject(DesktopNotificationSettingsService);
  private desktopNotify = inject(DesktopNotificationService);
  private messageService = inject(MessageService);

  isDesktop = isDesktopApp();
  prefs: DesktopNotificationPreferences = this.settings.getPreferences();
  private sub?: Subscription;

  ngOnInit(): void {
    this.sub = this.settings.preferences$.subscribe((prefs) => {
      this.prefs = { ...prefs };
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  onPrefChange(): void {
    this.settings.updatePreferences(this.prefs);
  }

  onMasterChange(): void {
    this.settings.updatePreferences({ enabled: this.prefs.enabled });
  }

  async sendTestNotification(): Promise<void> {
    const ok = await this.desktopNotify.show(
      'Esta é uma notificação de teste do SyncDB Desktop.',
      'Teste de notificação',
      undefined,
      { bypassFocusCheck: true }
    );

    if (ok) {
      this.messageService.add({
        severity: 'success',
        summary: 'Enviada',
        detail: 'Notificação de teste disparada.',
      });
      return;
    }

    this.messageService.add({
      severity: 'warn',
      summary: 'Não enviada',
      detail:
        'Verifique se as notificações estão ativas, se você está no app desktop e se a janela não está em foco (quando a opção "somente em segundo plano" estiver ligada).',
    });
  }
}
