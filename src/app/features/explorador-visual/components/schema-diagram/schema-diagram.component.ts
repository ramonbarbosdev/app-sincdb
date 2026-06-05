import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { Vflow } from 'ngx-vflow';
import { DiagramNode, StatusComparacao } from '../../models/explorador-visual.model';
import { DiagramToolbarComponent } from '../diagram-toolbar/diagram-toolbar.component';

@Component({
  selector: 'app-explorador-schema-diagram',
  standalone: true,
  imports: [CommonModule, TagModule, ProgressSpinnerModule, Vflow, DiagramToolbarComponent],
  templateUrl: './schema-diagram.component.html',
  styleUrl: './schema-diagram.component.scss',
})
export class SchemaDiagramComponent {
  @Input() nodes: any[] = [];
  @Input() edges: any[] = [];
  @Input() loading = false;
  @Input() selectedNodeId = '';
  @Output() tableSelected = new EventEmitter<DiagramNode>();

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
