import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Table, TableModule } from 'primeng/table';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { BaseService } from '../../../../services/base.service';
import { ActivatedRoute, Router } from '@angular/router';
import { InputNumberModule } from 'primeng/inputnumber';
import { CommonModule } from '@angular/common';
import { Parametromaster } from '../../../../models/parametromaster';
import { FlagOption } from '../../../../models/flag-option';
import { FormsModule } from '@angular/forms';
import { ParametroMasterForm } from '../parametro-master-form/parametro-master-form';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

@Component({
  selector: 'app-parametro-master-list',
  imports: [  ButtonModule,
    InputNumberModule,
    InputTextModule,
    TableModule,
    CommonModule,
    TableModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    ButtonModule,
    FormsModule,
    ParametroMasterForm,
    ToggleSwitchModule,
  ],
  templateUrl: './parametro-master-list.html',
  styleUrl: './parametro-master-list.scss',
})
export class ParametroMasterList {
 loading: boolean = true;
  public listagem: Parametromaster[] = [];
  public baseService = inject(BaseService);
  endpoint = 'parametromaster';
  primaryKey = 'id_parametromaster';
  router = inject(Router);
  isDialog: boolean = false;
  idEdicao!: number;
  constructor(private cd: ChangeDetectorRef) {}

  public categorias: FlagOption[] = [];

  @ViewChild('filter') filter!: ElementRef;

  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
  }

  onAdd() {
    this.idEdicao = 0;
    this.isDialog = true;
  }

  clear(table: Table) {
    table.clear();
    if (this.filter) {
      this.filter.nativeElement.value = '';
    }
  }

  ngOnInit(): void {
    this.onShow();
  }

  onShow = () => {
    this.loading = true;

    this.baseService.findAll(`${this.endpoint}/`).subscribe({
      next: (res) => {
        const novaListagem: Parametromaster[] = [];
        Object.values(res as any).forEach((index: any) => {
          let item = new Parametromaster();
          item = index;
          item.valor = this.convertValue(
            item.valor,
            item.tipo
          );
          novaListagem.push(item);
        });
        this.listagem = novaListagem;
        this.loading = false;
        this.cd.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.cd.markForCheck();
      },
    });
  };

  // Função genérica para converter valor conforme o tipo
  convertValue(value: any, type: string): string | number | boolean | Date {
    switch (type) {
      case 'bool':
        return value === 'true';
      case 'number':
        return Number(value);
      case 'date':
        return new Date(value);
      case 'text':
      default:
        return value?.toString() ?? '';
    }
  }

  onEdit(item: any) {
    if (item && item[this.primaryKey]) {
      this.idEdicao = item[this.primaryKey];
      this.isDialog = true;
    } else {
      console.error('ID está indefinido');
    }
  }

  onSave(param: any) {
    this.baseService.create(`${this.endpoint}/cadastrar`, param).subscribe({
      next: () => {
        this.onShow();
      },
      error: () => {},
    });
  }

  parseBoolean(valor: string | null | undefined): boolean {
    return valor?.toLowerCase() === 'true';
  }
  onDelete(item: any) {
    this.loading = true;
    this.baseService
      .deleteById(`${this.endpoint}`, item[this.primaryKey])
      .subscribe({
        next: (res) => {
          this.loading = false;
          this.onShow();
        },
        error: (err) => {
          this.loading = false;
        },
      });
  }
}
