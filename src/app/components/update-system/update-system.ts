import { Component, inject } from '@angular/core';
import { UpdateService } from '../../services/update.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-update-system',
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule],
  templateUrl: './update-system.html',
  styleUrl: './update-system.scss',
})
export class UpdateSystem {

  private updateService = inject(UpdateService);

  updateAvailable$ = this.updateService.updateAvailable;
  versionInfo$ = this.updateService.versionInfo;
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
  }

  update() {
    this.updateService.openLatestRelease();
  }

  dismiss() {
    this.showUpdateDialog = false;
  }
}
