import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { TabelaDetalhe, StatusComparacao } from '../../models/explorador-visual.model';

@Component({
  selector: 'app-explorador-table-details-panel',
  standalone: true,
  imports: [CommonModule, ProgressSpinnerModule, TagModule],
  templateUrl: './table-details-panel.component.html',
  styleUrl: './table-details-panel.component.scss',
})
export class TableDetailsPanelComponent {
  @Input() detalhe?: TabelaDetalhe;
  @Input() loading = false;

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
