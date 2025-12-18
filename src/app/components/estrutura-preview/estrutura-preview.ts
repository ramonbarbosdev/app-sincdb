import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
  OnChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { PanelModule } from 'primeng/panel';
import { TagModule } from 'primeng/tag';
import { AccordionModule } from 'primeng/accordion';
import { TextareaModule } from 'primeng/textarea';
import { SkeletonModule } from 'primeng/skeleton';
import { SplitterModule } from 'primeng/splitter';
import { ListboxModule } from 'primeng/listbox';
import { DialogModule } from 'primeng/dialog';
import { ScrollerModule } from 'primeng/scroller';
import { PaginatorModule } from 'primeng/paginator';

/* =======================
   MODELOS
======================= */

export interface EstruturaResponse {
  sucesso: boolean;
  base: string;
  esquema: string;
  geradoEm: string;
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

/* =======================
   COMPONENTE
======================= */

@Component({
  selector: 'app-estrutura-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    CheckboxModule,
    DividerModule,
    MessageModule,
    PanelModule,
    TagModule,
    AccordionModule,
    TextareaModule,
    SkeletonModule,
    SplitterModule,
    ListboxModule,
    DialogModule,
    ScrollerModule,
    PaginatorModule
  ],
  templateUrl: './estrutura-preview.html',
  styleUrl: './estrutura-preview.scss'
})
export class EstruturaPreview implements OnChanges {

  @Input({ required: true }) response!: EstruturaResponse;
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  categoriaSelecionada?: CategoriaDDLDTO;
  itensPaginados: DDLItemDTO[] = [];

  readonly rowsPorPagina = 5;

  /* =======================
     CICLO DE VIDA
  ======================= */

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['response'] && this.response) ||
      (changes['visible']?.currentValue === true && this.response)
    ) {
      this.resetarEstado();
    }
  }

  /* =======================
     MÉTODOS
  ======================= */

  private resetarEstado(): void {
    this.categoriaSelecionada = undefined;
    this.itensPaginados = [];
  }

  fecharDialog(): void {
    this.visibleChange.emit(false);
  }

  selecionarCategoria(): void {
    this.atualizarPagina(0);
  }

  onPageChange(event: any): void {
    this.atualizarPagina(event.first);
  }

  private atualizarPagina(start: number): void {
    if (!this.categoriaSelecionada?.items?.length) {
      this.itensPaginados = [];
      return;
    }

    this.itensPaginados = this.categoriaSelecionada.items.slice(
      start,
      start + this.rowsPorPagina
    );
  }

  trackById(_: number, item: DDLItemDTO): string {
    return item.id;
  }

  exportarJson(): void {
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

  executar(): void {
    const selecionados = this.response.categorias
      .flatMap(c => c.items)
      .filter(i => i.selecionado && i.executavel);

    console.log('Executar:', selecionados);
  }
}
