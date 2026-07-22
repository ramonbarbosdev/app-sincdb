import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';

export interface SyncErroItem {
  mensagem: string;
  sql?: string;
  showDetalhes: boolean;
  original: unknown;
}

@Component({
  selector: 'app-sync-erros',
  imports: [CardModule, TableModule, ButtonModule, FormsModule, CommonModule],
  templateUrl: './sync-erros.html',
  styleUrl: './sync-erros.scss',
})
export class SyncErros {
  errosNormalizados: SyncErroItem[] = [];

  @Input()
  set erros(value: any[]) {
    this.errosNormalizados = (value || []).map((erro) => this.normalizarErro(erro));
  }

  toggleDetalhes(erro: SyncErroItem) {
    erro.showDetalhes = !erro.showDetalhes;
  }

  exportarErros() {
    const json = JSON.stringify(
      this.errosNormalizados.map((item) => item.original),
      null,
      2
    );
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'erros_sincronizacao.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  private normalizarErro(erro: any): SyncErroItem {
    if (typeof erro === 'string') {
      return {
        mensagem: erro,
        sql: erro,
        showDetalhes: false,
        original: erro,
      };
    }

    const mensagem =
      erro?.mensagem ||
      erro?.message ||
      erro?.erro ||
      erro?.error ||
      (typeof erro === 'object' ? JSON.stringify(erro) : String(erro));

    return {
      mensagem,
      sql: erro?.sql || erro?.detail || erro?.detalhe || mensagem,
      showDetalhes: false,
      original: erro,
    };
  }
}
