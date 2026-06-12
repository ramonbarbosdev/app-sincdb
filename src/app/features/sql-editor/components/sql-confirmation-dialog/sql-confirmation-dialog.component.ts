import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { PendingSqlExecution } from '../../models/sql-editor.model';

@Component({
  selector: 'app-sql-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, ButtonModule, DialogModule],
  templateUrl: './sql-confirmation-dialog.component.html',
  styleUrl: './sql-confirmation-dialog.component.scss',
})
export class SqlConfirmationDialogComponent {
  @Input() visible = false;
  @Input() pending?: PendingSqlExecution;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
