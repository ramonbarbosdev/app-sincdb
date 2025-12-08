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
import { DialogModule } from 'primeng/dialog';
import { FluidModule } from 'primeng/fluid';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { BaseService } from '../../../../services/base.service';
import { ZodError } from 'zod';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { FlagOption } from '../../../../models/flag-option';
import { LayoutFormSimples } from '../../../../components/layouts/layout-form-simples/layout-form-simples';
import { LayoutCampo } from '../../../../components/layout-campo/layout-campo';
import { Empresa } from '../../../../models/empresa';
import { EmpresaSchema } from '../../../../schema/empresa-schema';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { PlanoAssinaturaSchema } from '../../../../schema/planoassinatura-schema';
import { Planoassinatura } from '../../../../models/planoassinatura';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';

@Component({
  selector: 'app-planoassinaturaform',
  imports: [
    DialogModule,
    InputTextModule,
    FluidModule,
    ButtonModule,
    SelectModule,
    FormsModule,
    TextareaModule,
    CommonModule,
    ProgressSpinnerModule,
    SelectModule,
    PasswordModule,
    LayoutFormSimples,
    LayoutCampo,
    ToggleButtonModule,
    InputGroupModule,
    InputNumberModule,
    InputGroupAddonModule,
  ],
  templateUrl: './planoassinaturaform.html',
  styleUrl: './planoassinaturaform.scss',
})
export class Planoassinaturaform {
  @Input() isDialog: boolean = true;
  @Output() isDialogChange = new EventEmitter<boolean>();
  @Input() onReloadList: () => void = () => {};
  @Input() key!: number;

  loading: boolean = true;
  public objeto: Planoassinatura = new Planoassinatura();
  public errorValidacao: Record<string, string> = {};
  private endpoint = 'planoassinatura';
  private route = inject(ActivatedRoute);
  private baseService = inject(BaseService);
  private cd = inject(ChangeDetectorRef);
  public listaAssinatura: FlagOption[] = [];

  hideDialog() {
    this.isDialog = false;
    this.isDialogChange.emit(false);
    this.limparFormulario();
  }

  onShow() {
    this.loading = true;
    this.limparFormulario();

    if (this.key == 0) {
      setTimeout(() => (this.loading = false), 0);
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

      this.baseService.create(`${this.endpoint}/cadastrar`, this.objeto).subscribe({
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
      PlanoAssinaturaSchema.parse([this.objeto]);
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

  limparFormulario() {
    this.objeto = new Planoassinatura();
    this.errorValidacao = {};
  }
}
