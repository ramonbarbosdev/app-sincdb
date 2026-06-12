import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { SqlMessage } from '../../models/sql-editor.model';

@Component({
  selector: 'app-sql-messages-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sql-messages-panel.component.html',
  styleUrl: './sql-messages-panel.component.scss',
})
export class SqlMessagesPanelComponent {
  @Input() messages: SqlMessage[] = [];
}
