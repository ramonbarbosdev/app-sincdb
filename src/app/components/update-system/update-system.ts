import { Component, inject } from '@angular/core';
import { UpdateService } from '../../services/update.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ProgressBarModule } from 'primeng/progressbar';

@Component({
  selector: 'app-update-system',
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule, ProgressBarModule],
  templateUrl: './update-system.html',
  styleUrl: './update-system.scss',
})
export class UpdateSystem {

  private updateService = inject(UpdateService);
  isMacOS = this.detectMacOS();

  updateAvailable$ = this.updateService.updateAvailable;
  versionInfo$ = this.updateService.versionInfo;
  downloading$ = this.updateService.downloading;
  progress$ = this.updateService.progress;
  downloaded$ = this.updateService.downloaded;
  error$ = this.updateService.error;
  showUpdateDialog = false;


  ngOnInit() {
    
    this.updateAvailable$.subscribe(avail => {
      if (avail) {
        this.showUpdateDialog = true;
      }
    });

    this.error$.subscribe(error => {
      if (error) {
        this.showUpdateDialog = true;
      }
    });

    this.downloading$.subscribe(downloading => {
      if (downloading) {
        this.showUpdateDialog = true;
      }
    });

    this.downloaded$.subscribe(downloaded => {
      if (downloaded) {
        this.showUpdateDialog = true;
      }
    });
  }

  update() {
    this.updateService.startUpdate();
  }

  install() {
    this.updateService.installUpdate();
  }

  openLatestRelease() {
    this.updateService.openLatestRelease();
  }

  dismiss() {
    this.showUpdateDialog = false;
  }

  private detectMacOS(): boolean {
    const platform = window.navigator.platform?.toLowerCase() || '';
    const userAgent = window.navigator.userAgent?.toLowerCase() || '';

    return platform.includes('mac') || userAgent.includes('mac os');
  }
}
