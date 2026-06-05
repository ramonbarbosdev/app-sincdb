import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-explorador-sql-preview-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sql-preview-panel.component.html',
  styleUrl: './sql-preview-panel.component.scss',
})
export class SqlPreviewPanelComponent {
  @Input() sql = '';
  @Input() loading = false;
}
