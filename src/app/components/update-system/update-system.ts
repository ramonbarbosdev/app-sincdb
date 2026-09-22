import { Component, inject } from '@angular/core';
import { UpdateService } from '../../services/update.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { environment } from '../../../environments/environment';
import { UpdateUiPreviewScenario } from '../../services/update.service';

@Component({
  selector: 'app-update-system',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    ProgressBarModule,
    ToggleSwitchModule,
  ],
  templateUrl: './update-system.html',
  styleUrl: './update-system.scss',
})
export class UpdateSystem {
  updateService = inject(UpdateService);

  readonly showDevPreview = !environment.production;
  readonly dialogStyle = { width: 'min(460px, calc(100vw - 2rem))' };
  previewAsMacOS = false;

  get isMacOS(): boolean {
    return this.previewAsMacOS || window.platform === 'darwin';
  }

  updateAvailable$ = this.updateService.updateAvailable;
  versionInfo$ = this.updateService.versionInfo;
  downloading$ = this.updateService.downloading;
  progress$ = this.updateService.progress;
  downloaded$ = this.updateService.downloaded;
  error$ = this.updateService.error;
  updateNotAvailable$ = this.updateService.updateNotAvailable;
  installFailed$ = this.updateService.installFailed;
  fallbackUrl$ = this.updateService.fallbackUrl;
  checking$ = this.updateService.checking;

  showUpdateDialog = false;

  ngOnInit() {
    this.updateAvailable$.subscribe((avail) => {
      if (avail) {
        this.showUpdateDialog = true;
      }
    });

    this.updateNotAvailable$.subscribe((notAvailable) => {
      if (notAvailable) {
        this.showUpdateDialog = true;
      }
    });

    this.error$.subscribe((error) => {
      if (error) {
        this.showUpdateDialog = true;
      }
    });

    this.checking$.subscribe((checking) => {
      if (checking) {
        this.showUpdateDialog = true;
      }
    });

    this.downloading$.subscribe((downloading) => {
      if (downloading) {
        this.showUpdateDialog = true;
      }
    });

    this.downloaded$.subscribe((downloaded) => {
      if (downloaded) {
        this.showUpdateDialog = true;
      }
    });

    this.installFailed$.subscribe((failed) => {
      if (failed) {
        this.showUpdateDialog = true;
      }
    });
  }

  update() {
    this.updateService.startUpdate();
  }

  install() {
    if (this.isMacOS) {
      this.openLatestRelease();
      return;
    }
    this.updateService.installUpdate();
  }

  openLatestRelease() {
    this.updateService.openLatestRelease();
  }

  dismiss() {
    this.showUpdateDialog = false;
  }

  preview(scenario: UpdateUiPreviewScenario): void {
    this.updateService.simulateUiPreview(scenario);
    this.showUpdateDialog = true;
  }

  previewFlow(): void {
    this.updateService.simulateUiPreviewFlow();
    this.showUpdateDialog = true;
  }

  clearPreview(): void {
    this.updateService.clearUiPreview();
    this.showUpdateDialog = false;
  }
}
