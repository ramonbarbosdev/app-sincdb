import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { Menu } from 'primeng/menu';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { EventService } from '../../../services/event.service';
import { SkeletonModule } from 'primeng/skeleton';
@Component({
  selector: 'app-layout-form-simples',
  standalone: true,
  imports: [
    ButtonModule,
    DialogModule,
    ProgressSpinnerModule,
    CommonModule,
    FormsModule,
    Menu,
    SkeletonModule,
  ],
  templateUrl: './layout-form-simples.html',
  styleUrl: './layout-form-simples.scss',
})
export class LayoutFormSimples {
  @Input() title: string = 'Novo registro';
  @Input() visible: boolean = false;
  @Input() loading: boolean = true;
  @Input() width: string = '700px';
  @Input() height: string = '300px';
  @Input() isMenu: boolean = false;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() save = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() show = new EventEmitter<void>();

  private eventService = inject(EventService);

 
  
  hideDialog() {
    this.visible = false;
    this.visibleChange.emit(this.visible);
    this.cancel.emit();
    this.loading = true;
  }

  headerButtons = [
    {
      label: 'Ajuda',
      icon: 'pi pi-question',
      class: 'p-button-text',
      action: () => this.onHelp(),
    },
    // {
    //   label: 'Fechar',
    //   icon: 'pi pi-times',
    //   class: 'p-button-text',
    //   action: () => this.hideDialog(),
    // },
  ];

  menuCard = [
    // {
    //   label: 'Editar',
    //   icon: 'pi pi-pencil',
    //   command: () => this.onEdit(),
    // },
    {
      label: 'Excluir',
      icon: 'pi pi-trash',
      command: () => this.onDelete(),
    },
    // {
    //   label: 'Detalhes',
    //   icon: 'pi pi-info-circle',
    //   command: () => this.onDetails(),
    // },
  ];

  onEdit() {
    console.log('Editar clicado');
  }
  onDelete() {
    this.delete.emit();
    console.log('Excluir clicado');
  }
  onDetails() {
    console.log('Detalhes clicado');
  }

  onHelp() {
    console.log('Ajuda clicada!');
  }

  onSave() {
    this.save.emit();
  }

  onDialogShow() {
    this.show.emit();
  }
}
