import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ResumoComparacao } from '../../models/explorador-visual.model';

@Component({
  selector: 'app-explorador-diff-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './diff-summary.component.html',
  styleUrl: './diff-summary.component.scss',
})
export class DiffSummaryComponent {
  @Input() resumo?: ResumoComparacao;

  itens() {
    const resumo = this.resumo || {};
    return [
      { label: 'Tabelas', value: resumo.totalTabelas ?? 0 },
      { label: 'Iguais', value: resumo.tabelasIguais ?? 0 },
      { label: 'Diferentes', value: resumo.tabelasDiferentes ?? 0 },
      { label: 'Ausentes', value: resumo.ausentesDestino ?? 0 },
      { label: 'Novas', value: resumo.novasDestino ?? 0 },
      { label: 'Colunas dif.', value: resumo.colunasDiferentes ?? resumo.totalDiferencas ?? 0 },
    ];
  }
}
