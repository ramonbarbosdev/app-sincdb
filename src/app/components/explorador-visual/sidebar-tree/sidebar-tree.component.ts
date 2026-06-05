import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  ComparacaoTabela,
  ExploradorSchema,
  ExploradorTabela,
} from '../../../models/explorador-visual.model';

@Component({
  selector: 'app-sidebar-tree',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar-tree.component.html',
  styleUrl: './sidebar-tree.component.scss',
})
export class SidebarTreeComponent {
  @Input() schemas: ExploradorSchema[] = [];
  @Input() comparacoes: ComparacaoTabela[] = [];
  @Output() tabelaSelecionada = new EventEmitter<ExploradorTabela>();

  tabelas(schema: ExploradorSchema): ExploradorTabela[] {
    return schema.tabelas || [];
  }

  comparacaoTabela(tabela: ExploradorTabela): ComparacaoTabela | undefined {
    return this.comparacoes.find((item) => item.nomeCompleto === tabela.nomeCompleto);
  }

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
}
