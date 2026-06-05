import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { SchemaResumo, StatusComparacao } from '../../models/explorador-visual.model';

@Component({
  selector: 'app-explorador-schema-sidebar',
  standalone: true,
  imports: [CommonModule, TagModule, ProgressSpinnerModule],
  templateUrl: './schema-sidebar.component.html',
  styleUrl: './schema-sidebar.component.scss',
})
export class SchemaSidebarComponent {
  @Input() schemas: SchemaResumo[] = [];
  @Input() selectedSchema = '';
  @Input() loading = false;
  @Output() schemaSelected = new EventEmitter<string>();

  severity(status: StatusComparacao): 'success' | 'info' | 'warn' | 'danger' {
    const map: Record<StatusComparacao, 'success' | 'info' | 'warn' | 'danger'> = {
      igual: 'success',
      diferente: 'warn',
      ausente_destino: 'danger',
      novo_destino: 'info',
    };
    return map[status];
  }
}
