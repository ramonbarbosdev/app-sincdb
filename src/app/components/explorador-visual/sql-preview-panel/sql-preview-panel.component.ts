import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-sql-preview-panel',
  standalone: true,
  imports: [CommonModule, CardModule],
  templateUrl: './sql-preview-panel.component.html',
  styleUrl: './sql-preview-panel.component.scss',
})
export class SqlPreviewPanelComponent {
  @Input() sql: string[] = [];
}
