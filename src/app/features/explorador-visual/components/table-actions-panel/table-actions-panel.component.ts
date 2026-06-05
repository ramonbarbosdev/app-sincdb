import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { AmbienteExplorador, TabelaDetalhe } from '../../models/explorador-visual.model';

@Component({
  selector: 'app-explorador-table-actions-panel',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './table-actions-panel.component.html',
  styleUrl: './table-actions-panel.component.scss',
})
export class TableActionsPanelComponent {
  @Input() detalhe?: TabelaDetalhe;
  @Input() ambiente: AmbienteExplorador = 'cloud';
  @Input() loadingDados = false;
  @Output() visualizarDados = new EventEmitter<void>();
}
