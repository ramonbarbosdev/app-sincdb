import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import {
  ModoOperacao,
  SchemaResumo,
  StatusComparacao,
  TabelaResumo,
} from '../../models/explorador-visual.model';

@Component({
  selector: 'app-explorador-sidebar-tree',
  standalone: true,
  imports: [CommonModule, TagModule, ProgressSpinnerModule],
  templateUrl: './sidebar-tree.component.html',
  styleUrl: './sidebar-tree.component.scss',
})
export class SidebarTreeComponent {
  @Input() modoOperacao: ModoOperacao = 'explorar';
  @Input() schemas: SchemaResumo[] = [];
  @Input() tabelas: TabelaResumo[] = [];
  @Input() selectedSchema = '';
  @Input() selectedTableId = '';
  @Input() loading = false;
  @Output() schemaSelected = new EventEmitter<string>();
  @Output() tableSelected = new EventEmitter<TabelaResumo>();

  severity(status?: StatusComparacao): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const map: Record<StatusComparacao, 'success' | 'info' | 'warn' | 'danger'> = {
      igual: 'success',
      diferente: 'warn',
      ausente_destino: 'danger',
      novo_destino: 'info',
    };
    return status ? map[status] : 'secondary';
  }
}
