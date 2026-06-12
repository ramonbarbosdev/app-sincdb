import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { SelectOption, SqlEnvironment } from '../../models/sql-editor.model';

@Component({
  selector: 'app-sql-editor-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, SelectModule, TagModule],
  templateUrl: './sql-editor-toolbar.component.html',
  styleUrl: './sql-editor-toolbar.component.scss',
})
export class SqlEditorToolbarComponent {
  @Input() ambiente: SqlEnvironment = 'cloud';
  @Input() conexaoId = '';
  @Input() base = 'neondb';
  @Input() connected = true;
  @Input() ambientes: SelectOption[] = [];
  @Input() conexoes: SelectOption[] = [];
  @Input() bases: SelectOption[] = [];
  @Input() loadingConexoes = false;
  @Input() loadingBases = false;

  @Output() ambienteChange = new EventEmitter<SqlEnvironment>();
  @Output() conexaoIdChange = new EventEmitter<string>();
  @Output() baseChange = new EventEmitter<string>();
  @Output() refresh = new EventEmitter<void>();
}
