import { Component, inject } from '@angular/core';
import { UpdateService } from '../../services/update.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ProgressBar } from 'primeng/progressbar';

@Component({
  selector: 'app-update-system',
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule, ProgressBar],
  templateUrl: './update-system.html',
  styleUrl: './update-system.scss',
})
export class UpdateSystem {

  private updateService = inject(UpdateService);

  updateAvailable$ = this.updateService.updateAvailable;
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
  }

  update() {
    this.updateService.startUpdate();
  }

  install() {
    this.updateService.installUpdate();
  }
}
