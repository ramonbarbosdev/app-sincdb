import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { BaseService } from '../../../../services/base.service';
import { FluidModule } from 'primeng/fluid';
import { InputTextModule } from 'primeng/inputtext';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TabsModule } from 'primeng/tabs';
import { FlagOption } from '../../../../models/flag-option';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ZodError } from 'zod';
import { LayoutCampo } from '../../../../components/layout-campo/layout-campo';
import { Rotapermission } from '../../../../models/rotapermission';
import { getDescricaoMethodMap } from '../../../../map/method.map';
import { RotaPermissaoSchema } from '../../../../schema/rotapermissao-schema';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-rotapermissiondetail',
  imports: [
    FluidModule,
    InputTextModule,
    CommonModule,
    FormsModule,
    TabsModule,
    TableModule,
    ButtonModule,
    LayoutCampo,
    SelectModule,
  ],
  templateUrl: './rotapermissiondetail.html',
  styleUrl: './rotapermissiondetail.scss',
})
export class Rotapermissiondetail {
  @Input() objeto: any;
  @Input() primaryKey: string = 'id_role';
  @Output() objetoChange = new EventEmitter<any>();

  @Input() itemTemp: Rotapermission = new Rotapermission();
  @Input() carregarDados = false;
  @Input() nomeItem!: string;

  indexEditando: number | null = null;
  public errorValidacao: Record<string, string> = {};
  baseService = inject(BaseService);
  public endpoint = 'rotapermission';
  private cd = inject(ChangeDetectorRef);
  listaRotas: FlagOption[] = [];

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['objeto'] && this.carregarDados) {
      this.limparCampos();
      // this.obterRotas();
    }
  }

  atualizarValor(valorAtualizado: any) {
    this.objeto = valorAtualizado;
    this.objetoChange.emit(this.objeto);
  }

  adicionarItem() {
    if (!this.objeto[this.nomeItem]) this.objeto[this.nomeItem] = [];
    if (!this.validarItens()) return;

    if (this.indexEditando != null) {
      this.objeto[this.nomeItem][this.indexEditando] = this.itemTemp;
      this.indexEditando = null;
    } else {
      if (this.objeto[this.primaryKey])
        (this.itemTemp as any)[this.primaryKey] = this.objeto[this.primaryKey];
      this.objeto[this.nomeItem].push(this.itemTemp);
    }

    this.limparCampos();
    this.objetoChange.emit(this.objeto);
  }

  validarItens(): any {
    try {
      RotaPermissaoSchema.parse([this.itemTemp]);
      return true;
    } catch (error) {
      if (error instanceof ZodError) {
        this.errorValidacao = {};
        error.issues.forEach((e) => {
          const value = e.path[1];
          this.errorValidacao[String(value)] = e.message;
        });
        return false;
      }
    }
  }

  limparCampos() {
    this.itemTemp = new Rotapermission();
    this.errorValidacao = {};
  }

  editarItem(index: number) {
    this.indexEditando = index;
    this.itemTemp = { ...this.objeto[this.nomeItem][index] };
  }

  removerItem(index: number) {
    this.limparCampos();
    this.objeto[this.nomeItem].splice(index, 1);
    this.objetoChange.emit(this.objeto);
  }

  obterRotas() {
    this.baseService.findAll(`rotas/`).subscribe({
      next: (res) => {
        this.listaRotas = (res as any).map((index: any) => {
          const item = new FlagOption();
          item.code = index.path;
          item.name = index.path;
          return item;
        });
        this.cd.markForCheck(); // só uma vez
      },
      error: (err) => {},
    });
  }

  getIconForMethod(method: string): string {
    switch (method.toUpperCase()) {
      case 'GET':
        return '<i class="pi pi-eye" title="Visualizar"></i>';
      case 'POST':
        return '<i class="pi pi-plus" title="Criar"></i>';
      case 'PUT':
        return '<i class="pi pi-pencil" title="Editar"></i>';
      case 'DELETE':
        return '<i class="pi pi-trash" title="Excluir"></i>';
      default:
        return '';
    }
  }

  getClassesMethod(methods: string[] | string): string[] {
    if (!methods) return [];
    const arr = Array.isArray(methods)
      ? methods
      : methods.split(',').map((m) => m.trim().toUpperCase());

    const MethodIconMap: Record<string, string> = {
      GET: 'pi-eye text-green-500',
      POST: 'pi-plus text-blue-500',
      PUT: 'pi-pencil text-orange-500',
      DELETE: 'pi-trash text-red-500',
    };

    return arr.map((m) => MethodIconMap[m] || '');
  }

  listaMetodos = [
    { name: getDescricaoMethodMap('GET'), code: 'GET' },
    { name: getDescricaoMethodMap('POST'), code: 'POST' },
    { name: getDescricaoMethodMap('PUT'), code: 'PUT' },
    { name: getDescricaoMethodMap('DELETE'), code: 'DELETE' },
  ];
}
