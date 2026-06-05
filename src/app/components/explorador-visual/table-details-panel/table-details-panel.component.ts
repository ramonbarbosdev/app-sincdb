import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import {
  ComparacaoTabela,
  ExploradorTabela,
} from '../../../models/explorador-visual.model';

@Component({
  selector: 'app-table-details-panel',
  standalone: true,
  imports: [CommonModule, CardModule, TagModule],
  templateUrl: './table-details-panel.component.html',
  styleUrl: './table-details-panel.component.scss',
})
export class TableDetailsPanelComponent {
  @Input() table?: ExploradorTabela;
  @Input() comparison?: ComparacaoTabela;

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
}
