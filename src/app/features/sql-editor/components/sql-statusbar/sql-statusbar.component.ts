import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { SqlEnvironment } from '../../models/sql-editor.model';

@Component({
  selector: 'app-sql-statusbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sql-statusbar.component.html',
  styleUrl: './sql-statusbar.component.scss',
})
export class SqlStatusbarComponent {
  @Input() ambiente: SqlEnvironment = 'local';
  @Input() conexaoLabel = '';
  @Input() base = '';
  @Input() rows = 0;
  @Input() statusLabel = '';
}