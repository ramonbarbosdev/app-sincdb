import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BaseService } from '../../../../services/base.service';
import { ZodError } from 'zod';
import { LayoutFormSimples } from '../../../../components/layouts/layout-form-simples/layout-form-simples';

import { TextareaModule } from 'primeng/textarea';
import { LayoutCampo } from '../../../../components/layout-campo/layout-campo';
import { Parametromaster } from '../../../../models/parametromaster';

import { FlagOption } from '../../../../models/flag-option';
import { ParametroService } from '../../../../services/parametro.service';
import { ParametroMasterSchema } from '../../../../schema/parametromaster-schema';
import { Select } from "primeng/select";


@Component({
  selector: 'app-parametro-master-form',
  imports: [InputTextModule,
    FormsModule,
    CommonModule,
    LayoutFormSimples,
    TextareaModule,
    LayoutCampo, Select],
  templateUrl: './parametro-master-form.html',
  styleUrl: './parametro-master-form.scss',
})
export class ParametroMasterForm {
  @Input() isDialog: boolean = true;
  @Output() isDialogChange = new EventEmitter<boolean>();
  @Input() onReloadList: () => void = () => { };
  @Input() key!: number;

  loading: boolean = true;
  public objeto: Parametromaster = new Parametromaster();
  public errorValidacao: Record<string, string> = {};
  private endpoint = 'parametromaster';
  public baseService = inject(BaseService);
  private cd = inject(ChangeDetectorRef);
  public parametroService = inject(ParametroService);

  public listarCategoria: FlagOption[] = [];
  public listarTipo: FlagOption[] = [];

  tipos = [
    { label: 'Texto', value: 'string' },
    { label: 'Número', value: 'number' },
    { label: 'Booleano', value: 'boolean' },
    { label: 'Data', value: 'date' },
    { label: 'Seleção', value: 'select' },
  ];

  hideDialog() {
    this.isDialog = false;
    this.isDialogChange.emit(false);
    this.limparFormulario();
  }

  onShow() {
    this.loading = true;
    this.limparFormulario();

    this.obterTipo();

    if (this.key == 0) {
      this.obterSequencia();
    } else {
      this.onEdit(this.key);
    }
  }

  onEdit(id: number) {
    if (!id) {
      this.loading = false;
      return;
    }

    this.baseService.findById(`${this.endpoint}`, id).subscribe({
      next: (res: any) => {
        this.objeto = res;
        this.loading = false;
        this.cd.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.cd.markForCheck();
      },
    });
  }

  onSave() {
    if (this.validarItens()) {
      this.loading = true;
      this.baseService
        .create(`${this.endpoint}/cadastrar`, this.objeto)
        .subscribe({
          next: () => {
            this.loading = false;
            this.hideDialog();
            this.onReloadList();
            this.cd.markForCheck();
          },
          error: (erro) => {
            this.loading = false;
            this.cd.markForCheck();
          },
        });
    }
  }

  validarItens(): boolean {
    try {
      ParametroMasterSchema.parse([this.objeto]);

      this.errorValidacao = {};
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
      throw error;
    }
  }

  obterSequencia() {
    this.baseService.findSequence(this.endpoint).subscribe({
      next: (res) => {
        this.objeto.codigo = res.sequencia;
        this.loading = false;
        this.cd.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cd.markForCheck();
      },
    });
  }

  limparFormulario() {
    this.objeto = new Parametromaster();
    this.errorValidacao = {};
  }


  obterTipo() {
    this.baseService.findAll(`${this.endpoint}/tipo-parametro`).subscribe({
      next: (res) => {
        this.listarTipo = (res as any).map((index: any) => {
          const item = new FlagOption();
          item.code = String(index);
          item.name = index;
          return item;
        });
        this.cd.markForCheck();
      },
      error: (err) => {
        this.cd.markForCheck();
      },
    });
  }
}
