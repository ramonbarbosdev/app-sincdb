import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { AppFloatingConfigurator } from '../../../layout/component/app.floatingconfigurator';
import { RippleModule } from 'primeng/ripple';
import { Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { Auth } from '../../../models/auth';
import { CommonModule } from '@angular/common';
import { LoginSchema } from '../../../schema/login-schema';
import { ZodError } from 'zod';
import { NgxMaskDirective } from 'ngx-mask';
import { AuthService } from '../../../auth/auth.service';
import { MessageService } from 'primeng/api';
import { LayoutCampo } from '../../../components/layout-campo/layout-campo';
import { SelectModule } from 'primeng/select';
import { FlagOption } from '../../../models/flag-option';
import { SelecionarOrganizacao } from '../selecionar-organizacao/selecionar-organizacao';

@Component({
  selector: 'app-login',
  imports: [
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    PasswordModule,
    FormsModule,
    RouterModule,
    RippleModule,
    CommonModule,
    ReactiveFormsModule,
    MessageModule,
    NgxMaskDirective,
    LayoutCampo,
    SelectModule,
    SelecionarOrganizacao,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  public objeto = new Auth();
  checked: boolean = false;
  loading: boolean = false;
  visibleOrganizacao: boolean = false;

  private auth = inject(AuthService);
  public errorValidacao: Record<string, string> = {};
  private messageService = inject(MessageService);
  private cd = inject(ChangeDetectorRef);

  public listaEmpresa: FlagOption[] = [];

  ngOnInit(): void {
    this.verificarUsuarioLogado();
  }

  hideDialog() {
    this.visibleOrganizacao = false;
  }

  entrar() {
    if (!this.validarItens()) return;

    this.auth.obterOrganizacao(this.objeto).subscribe({
      next: (res) => {
      
        this.visibleOrganizacao = true;
        this.listaEmpresa = (res.tenants as any).map((index: any) => {
          const item = new FlagOption();
          item.code = String(index.id_tenant);
          item.name = index.nm_empresa;
          return item;
        });

        this.objeto.role = res.role;
      },
      error: (e) => {
        this.visibleOrganizacao = false;
      },
    });
  }

  validarItens(): any {
    try {
      LoginSchema.parse([this.objeto]);
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

  verificarUsuarioLogado() {
    this.auth.checkAuth().subscribe({
      next: (res) => {
        console.log('Usuário logado');
      },
    });
  }
}
