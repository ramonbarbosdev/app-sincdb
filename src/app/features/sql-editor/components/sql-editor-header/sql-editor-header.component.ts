import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-sql-editor-header',
  standalone: true,
  imports: [CommonModule, ButtonModule, MenuModule],
  templateUrl: './sql-editor-header.component.html',
  styleUrl: './sql-editor-header.component.scss',
})
export class SqlEditorHeaderComponent {
  @Output() novo = new EventEmitter<void>();
  @Output() salvar = new EventEmitter<void>();
  @Output() historico = new EventEmitter<void>();

  menuItems: MenuItem[] = [
    {
      label: 'Exportar resultado',
      icon: 'pi pi-download',
      disabled: true,
    },
    {
      label: 'Preferencias',
      icon: 'pi pi-cog',
      disabled: true,
    },
  ];
}
