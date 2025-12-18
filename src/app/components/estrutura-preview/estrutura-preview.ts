import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { PanelModule } from 'primeng/panel';
import { TagModule } from 'primeng/tag';
import { AccordionModule } from 'primeng/accordion';
import { TextareaModule } from 'primeng/textarea';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SkeletonModule } from 'primeng/skeleton';
import { SplitterModule } from 'primeng/splitter';
import { ListboxModule } from 'primeng/listbox';
import { DialogModule } from 'primeng/dialog';

export interface EstruturaResponse {
  sucesso: boolean;
  base: string;
  esquema: string;
  geradoEm: string; // ISO string (ex: 2025-12-18T11:20:37.965)
  resumo: ResumoDTO;
  categorias: CategoriaDDLDTO[];
}

export interface ResumoDTO {
  totalQueries: number;
  totalCategorias: number;
  totalPerigosas: number;
  totalSelecionadas: number;
  possuiOperacoesPerigosas: boolean;
  podeExecutar: boolean;
  mensagem: string;
}
export interface CategoriaDDLDTO {
  id: string;
  titulo: string;
  icone: string;
  ordem: number;
  perigosa: boolean;
  total: number;
  items: DDLItemDTO[];
}
export interface DDLItemDTO {
  id: string;
  objeto: string;
  tipo: string;
  sql: string | null;
  perigoso: boolean;
  executavel: boolean;
  selecionado: boolean;
  avisos: string[];
  dependencias: string[];
}


@Component({
  selector: 'app-estrutura-preview',
  imports: [CardModule,
    AccordionModule,
    PanelModule,
    CheckboxModule,
    TagModule,
    TextareaModule,
    ButtonModule,
    DividerModule,
    MessageModule,
    CommonModule,
    FormsModule,
    SkeletonModule,
    SplitterModule,
    ListboxModule,
    DialogModule],
    standalone: true,
  templateUrl: './estrutura-preview.html',
  styleUrl: './estrutura-preview.scss',
})
export class EstruturaPreview {
  @Input() response!: EstruturaResponse;
  @Input() visible: boolean = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  hideDialog() {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  categoriaSelecionada?: CategoriaDDLDTO;

  trackById(_: number, item: DDLItemDTO) {
    return item.id;
  }

  exportarJson() {
    const blob = new Blob(
      [JSON.stringify(this.response, null, 2)],
      { type: 'application/json' }
    );

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'estrutura-ddl.json';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  executar() {
    const selecionados = this.response.categorias
      .flatMap(c => c.items)
      .filter(i => i.selecionado && i.executavel);

    console.log('Executar:', selecionados);
    // aqui você chama o backend
  }
}
