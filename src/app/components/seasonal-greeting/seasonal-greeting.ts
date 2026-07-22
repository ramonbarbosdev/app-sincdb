import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { SeasonalThemeService } from '../../services/seasonal-theme.service';

@Component({
  selector: 'app-seasonal-greeting',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="seasonal-greeting" *ngIf="seasonal.showGreeting()">
      <i [class]="seasonal.greetingIcon()" aria-hidden="true"></i>
      <span class="seasonal-greeting-text"></span>
    </div>
  `,
})
export class SeasonalGreeting {
  seasonal = inject(SeasonalThemeService);
}
