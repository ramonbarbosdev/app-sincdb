import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { FlagOption } from '../../../models/flag-option';

@Component({
  selector: 'app-connection-selector-header',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, SelectModule],
  templateUrl: './connection-selector-header.component.html',
  styleUrl: './connection-selector-header.component.scss',
})
export class ConnectionSelectorHeaderComponent {
  @Input() base = '';
  @Input() esquema = 'public';
  @Input() loading = false;
  @Input() loadingBases = false;
  @Input() loadingEsquemas = false;
  @Input() bases: FlagOption[] = [];
  @Input() esquemas: FlagOption[] = [];

  @Output() baseChange = new EventEmitter<string>();
  @Output() esquemaChange = new EventEmitter<string>();
  @Output() comparar = new EventEmitter<void>();
}
