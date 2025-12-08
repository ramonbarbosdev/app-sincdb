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
import { Usuarios } from '../../../../models/usuarios';
import { FlagOption } from '../../../../models/flag-option';
import { NgxMaskDirective } from 'ngx-mask';
import { LayoutFormSimples } from '../../../../components/layouts/layout-form-simples/layout-form-simples';
import { LayoutCampo } from '../../../../components/layout-campo/layout-campo';
import { ConverterNomeRole } from '../../../../utils/ConverterNomeRole';
import { UsuarioSchema } from '../../../../schema/usuario-schema';
import { TabsModule } from 'primeng/tabs';
import { Usuarioempresa } from '../../../../models/usuarioempresa';
import { Usuarioempresadetail } from '../usuarioempresadetail/usuarioempresadetail';
@Component({
  selector: 'app-usuarioform',
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
    NgxMaskDirective,
    LayoutFormSimples,
    LayoutCampo,
    TabsModule,
    Usuarioempresadetail,
  ],
  templateUrl: './usuarioform.html',
  styleUrl: './usuarioform.scss',
})
export class Usuarioform {
  @Input() isDialog: boolean = true;
  @Output() isDialogChange = new EventEmitter<boolean>();
  @Input() onReloadList: () => void = () => {};
  @Input() key!: number;

  loading: boolean = true;
  public objeto: Usuarios = new Usuarios();
  public itensUsuarioEmpresa: Usuarioempresa = new Usuarioempresa();
  carregarDetalhes = false;
  public errorValidacao: Record<string, string> = {};
  private endpoint = 'usuario';
  private route = inject(ActivatedRoute);
  private baseService = inject(BaseService);
  private cd = inject(ChangeDetectorRef);
  public listaRoles: FlagOption[] = [];

  hideDialog() {
    this.isDialog = false;
    this.isDialogChange.emit(false);
    this.limparFormulario();
    this.carregarDetalhes = false;
  }

  onShow() {
    this.loading = true;
    this.limparFormulario();

    this.obterRole();

    if (this.key == 0) {
      setTimeout(() => (this.loading = false), 0);
    } else {
      this.onEdit(this.key);
    }
    this.carregarDetalhes = true;
  }

  onEdit(id: number) {
    if (!id) {
      this.loading = false;
      return;
    }

    this.baseService.findById(`${this.endpoint}`, id).subscribe({
      next: (res: any) => {
        this.objeto.id = res.userId;
        this.objeto.nome = res.userNome;
        this.objeto.role = res.roles[0];
        this.objeto.login = res.userLogin;
        this.objeto.senha = res.userSenha;
        this.objeto.itensUsuarioEmpresa = res.itensUsuarioEmpresa;
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

      this.objeto.roles = [{ nomeRole: this.objeto.role }];

       this.baseService.create(`${this.endpoint}/`, this.objeto).subscribe({
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
      UsuarioSchema.parse([this.objeto]);
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
    this.objeto = new Usuarios();
    this.errorValidacao = {};
  }

  obterRole() {
    this.baseService.findAll(`role/`).subscribe({
      next: (res) => {
        this.listaRoles = (res as any).map((index: any) => {
          const item = new FlagOption();
          item.code = index.nomeRole;
          item.name = ConverterNomeRole(index.nomeRole);
          this.cd.markForCheck();
          return item;
        });
      },
      error: (err) => {},
    });
  }
}
