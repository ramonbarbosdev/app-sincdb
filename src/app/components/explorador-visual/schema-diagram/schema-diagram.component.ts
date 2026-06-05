import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { Vflow } from 'ngx-vflow';
import {
  ComparacaoTabela,
  ExploradorTabela,
} from '../../../models/explorador-visual.model';

@Component({
  selector: 'app-schema-diagram',
  standalone: true,
  imports: [CommonModule, TagModule, Vflow],
  templateUrl: './schema-diagram.component.html',
  styleUrl: './schema-diagram.component.scss',
})
export class SchemaDiagramComponent {
  @Input() nodes: any[] = [];
  @Input() edges: any[] = [];
  @Output() tabelaSelecionada = new EventEmitter<{
    tabela: ExploradorTabela;
    comparacao?: ComparacaoTabela;
  }>();

  statusLabel(status?: string): string {
    const labels: Record<string, string> = {
      igual: 'Igual',
      diferente: 'Diferente',
      ausente_destino: 'Ausente destino',
      novo_destino: 'Novo destino',
      carregado: 'Carregado',
      comparado: 'Comparado',
    };
    return status ? labels[status] || status : '-';
  }

  tagSeverity(status?: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const severities: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
      igual: 'success',
      diferente: 'warn',
      ausente_destino: 'danger',
      novo_destino: 'info',
      carregado: 'secondary',
      comparado: 'secondary',
    };
    return status ? severities[status] || 'secondary' : 'secondary';
  }

  statusClass(status?: string): string {
    const classes: Record<string, string> = {
      igual: 'status-equal',
      diferente: 'status-different',
      ausente_destino: 'status-missing',
      novo_destino: 'status-new',
      carregado: 'status-loaded',
      comparado: 'status-loaded',
    };
    return status ? classes[status] || 'status-loaded' : 'status-loaded';
  }
}
