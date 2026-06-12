import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SavedSqlQuery } from '../../models/sql-editor.model';

@Component({
  selector: 'app-sql-saved-queries-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sql-saved-queries-panel.component.html',
  styleUrl: './sql-saved-queries-panel.component.scss',
})
export class SqlSavedQueriesPanelComponent {
  @Input() items: SavedSqlQuery[] = [];
  @Output() selected = new EventEmitter<SavedSqlQuery>();
}
