import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-sql-toolbar',
  standalone: true,
  imports: [CommonModule, ButtonModule, MenuModule],
  templateUrl: './sql-toolbar.component.html',
  styleUrl: './sql-toolbar.component.scss',
})
export class SqlToolbarComponent {
  @Input() executing = false;

  @Output() executar = new EventEmitter<void>();
  @Output() executarSelecionado = new EventEmitter<void>();
  @Output() formatar = new EventEmitter<void>();
  @Output() limpar = new EventEmitter<void>();
  @Output() salvar = new EventEmitter<void>();
  @Output() historico = new EventEmitter<void>();

  menuItems: MenuItem[] = [
    { label: 'Explain plan', icon: 'pi pi-sitemap', disabled: true },
    { label: 'Exportar resultados', icon: 'pi pi-download', disabled: true },
  ];
}
