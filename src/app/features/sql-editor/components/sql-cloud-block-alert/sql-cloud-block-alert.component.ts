import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SqlEnvironment } from '../../models/sql-editor.model';

@Component({
  selector: 'app-sql-cloud-block-alert',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './sql-cloud-block-alert.component.html',
  styleUrl: './sql-cloud-block-alert.component.scss',
})
export class SqlCloudBlockAlertComponent {
  @Input() message = '';
  @Input() ambiente: SqlEnvironment = 'local';
  @Input() isAdmin = false;

  @Output() usarLocal = new EventEmitter<void>();
}