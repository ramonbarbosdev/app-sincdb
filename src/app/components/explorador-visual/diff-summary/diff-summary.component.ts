import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ComparacaoResumo } from '../../../models/explorador-visual.model';

@Component({
  selector: 'app-diff-summary',
  standalone: true,
  imports: [CommonModule, CardModule],
  templateUrl: './diff-summary.component.html',
  styleUrl: './diff-summary.component.scss',
})
export class DiffSummaryComponent {
  @Input() resumo?: ComparacaoResumo;

  itens() {
    const resumo = this.resumo;
    if (!resumo) {
      return [];
    }

    return [
      { label: 'Tabelas iguais', value: resumo.tabelasIguais },
      { label: 'Tabelas diferentes', value: resumo.tabelasDiferentes },
      { label: 'Ausentes destino', value: resumo.tabelasAusentesDestino },
      { label: 'Novas destino', value: resumo.tabelasNovasDestino },
      { label: 'Colunas diferentes', value: resumo.colunasDiferentes },
      { label: 'FKs diferentes', value: resumo.foreignKeysDiferentes },
    ];
  }
}
