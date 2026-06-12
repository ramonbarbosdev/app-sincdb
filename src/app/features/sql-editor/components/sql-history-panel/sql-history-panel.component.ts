import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SqlHistoryItem } from '../../models/sql-editor.model';

@Component({
  selector: 'app-sql-history-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sql-history-panel.component.html',
  styleUrl: './sql-history-panel.component.scss',
})
export class SqlHistoryPanelComponent {
  @Input() items: SqlHistoryItem[] = [];
  @Output() selected = new EventEmitter<SqlHistoryItem>();
}
