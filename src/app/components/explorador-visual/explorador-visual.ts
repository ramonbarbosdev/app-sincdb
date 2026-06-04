import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';

type TableStatus = 'equal' | 'different' | 'missing' | 'new';

interface MockTable {
  id: string;
  schema: string;
  name: string;
  status: TableStatus;
  x: number;
  y: number;
  columns: {
    name: string;
    type: string;
    pk?: boolean;
    fk?: boolean;
    status?: TableStatus;
  }[];
}

@Component({
  selector: 'app-explorador-visual',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, TagModule, SelectModule],
  templateUrl: './explorador-visual.html',
  styleUrl: './explorador-visual.scss',
})
export class ExploradorVisual {
  origemSelecionada = 'Produção Cloud';
  destinoSelecionado = 'Banco Local';

  conexoes = [
    { label: 'Produção Cloud', value: 'Produção Cloud' },
    { label: 'Homologação', value: 'Homologação' },
    { label: 'Banco Local', value: 'Banco Local' },
    { label: 'Cliente Agrotech', value: 'Cliente Agrotech' },
  ];

  tabelas: MockTable[] = [
    {
      id: 'usuario',
      schema: 'public',
      name: 'usuario',
      status: 'equal',
      x: 80,
      y: 80,
      columns: [
        { name: 'id_usuario', type: 'uuid', pk: true },
        { name: 'nm_usuario', type: 'varchar' },
        { name: 'ds_email', type: 'varchar' },
        { name: 'id_empresa', type: 'uuid', fk: true },
      ],
    },
    {
      id: 'empresa',
      schema: 'public',
      name: 'empresa',
      status: 'different',
      x: 420,
      y: 120,
      columns: [
        { name: 'id_empresa', type: 'uuid', pk: true },
        { name: 'nm_empresa', type: 'varchar' },
        { name: 'nu_cnpj', type: 'varchar', status: 'different' },
        { name: 'fl_ativo', type: 'boolean' },
      ],
    },
    {
      id: 'contrato',
      schema: 'contrato',
      name: 'contrato',
      status: 'missing',
      x: 760,
      y: 90,
      columns: [
        { name: 'id_contrato', type: 'int4', pk: true },
        { name: 'cd_contrato', type: 'varchar' },
        { name: 'dt_assinatura', type: 'date', status: 'missing' },
        { name: 'id_empresa', type: 'uuid', fk: true },
      ],
    },
    {
      id: 'produto',
      schema: 'produtos',
      name: 'produto',
      status: 'new',
      x: 260,
      y: 390,
      columns: [
        { name: 'id_produto', type: 'uuid', pk: true },
        { name: 'nm_produto', type: 'varchar' },
        { name: 'vl_preco', type: 'numeric' },
      ],
    },
  ];

  selectedTable = this.tabelas[1];

  sqlPreview = `ALTER TABLE public.empresa
ADD COLUMN nu_cnpj VARCHAR(20);

ALTER TABLE contrato.contrato
ADD COLUMN dt_assinatura DATE;`;

  selecionarTabela(tabela: MockTable) {
    this.selectedTable = tabela;
  }

  statusLabel(status: TableStatus): string {
    return {
      equal: 'Igual',
      different: 'Diferente',
      missing: 'Ausente',
      new: 'Novo',
    }[status];
  }

  statusClass(status: TableStatus): string {
    return {
      equal: 'border-emerald-500/40 text-emerald-300',
      different: 'border-amber-500/40 text-amber-300',
      missing: 'border-red-500/40 text-red-300',
      new: 'border-indigo-500/40 text-indigo-300',
    }[status];
  }
}