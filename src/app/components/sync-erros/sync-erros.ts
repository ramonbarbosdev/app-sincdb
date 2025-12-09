import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button, ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';

@Component({
  selector: 'app-sync-erros',
  imports: [CardModule, TableModule, ButtonModule, FormsModule, CommonModule],
  templateUrl: './sync-erros.html',
  styleUrl: './sync-erros.scss',
})
export class SyncErros {
  @Input() erros: any[] = [];

  toggleDetalhes(erro: any) {
    // erro.showDetalhes = !erro.showDetalhes;
  }

  exportarErros() {
    const json = JSON.stringify(this.erros, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'erros_sincronizacao.json';
    a.click();
    URL.revokeObjectURL(url);
  }
}
