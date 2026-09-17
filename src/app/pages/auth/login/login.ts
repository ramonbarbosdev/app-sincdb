import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { RippleModule } from 'primeng/ripple';
import { Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { CommonModule } from '@angular/common';
import { LoginSchema } from '../../../schema/login-schema';
import { ZodError } from 'zod';
import { NgxMaskDirective } from 'ngx-mask';
import { AuthService } from '../../../auth/auth.service';
import { LayoutCampo } from '../../../components/layout-campo/layout-campo';
import { SelecionarOrganizacao } from '../selecionar-organizacao/selecionar-organizacao';
import { FlagOption } from '../../../models/flag-option';

export type LoginStep = 'credentials' | 'organization';

@Component({
  selector: 'app-login',
  imports: [
    ButtonModule,
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
    SelecionarOrganizacao,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  public objeto: { nuCpf: string; dsSenha: string; idOrganizacao?: string } = {
    nuCpf: '',
    dsSenha: '',
  };

  loginStep: LoginStep = 'credentials';
  loading = false;
  apiError: string | null = null;

  private auth = inject(AuthService);
  private router = inject(Router);
  public errorValidacao: Record<string, string> = {};
  private cd = inject(ChangeDetectorRef);

  public listaEmpresa: FlagOption[] = [];

  ngOnInit(): void {
    this.verificarUsuarioLogado();
  }

  get showOrgStepper(): boolean {
    return this.loginStep === 'organization';
  }

  voltarParaCredenciais(): void {
    this.loginStep = 'credentials';
    this.apiError = null;
    this.objeto.idOrganizacao = undefined;
    this.listaEmpresa = [];
    this.auth.clearSession();
    this.cd.markForCheck();
  }

  entrar() {
    if (!this.validarItens()) return;

    this.loading = true;
    this.apiError = null;
    this.auth.login(this.objeto).subscribe({
      next: (res: any) => {
        if (res.precisaSelecionarOrganizacao) {
          this.listaEmpresa = (res.organizacoes as any[]).map((index: any) => {
            const item = new FlagOption();
            item.code = String(index.idOrganizacao);
            item.name = index.nmOrganizacao;
            return item;
          });
          this.loginStep = 'organization';
          if (this.listaEmpresa.length === 1) {
            this.objeto.idOrganizacao = String(this.listaEmpresa[0].code);
          }
        } else {
          this.redirecionarPorOrganizacaoAtiva();
        }

        this.loading = false;
        this.cd.markForCheck();
      },
      error: (err) => {
        this.apiError =
          err?.error?.message ?? 'Não foi possível entrar. Verifique CPF e senha.';
        this.loginStep = 'credentials';
        this.loading = false;
        this.cd.markForCheck();
      },
    });
  }

  validarItens(): boolean {
    try {
      LoginSchema.parse([this.objeto]);
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
      return false;
    }
  }

  verificarUsuarioLogado() {
    this.auth.checkAuth().subscribe({
      next: (res: any) => {
        if (res) {
          this.redirecionarPorOrganizacaoAtiva();
        }
      },
    });
  }

  redirecionarPorOrganizacaoAtiva() {
    const role = this.auth.getRoleOrganizacaoAtiva();

    if (role === 'ROLE_DEV') {
      this.router.navigate(['dev/home']);
      return;
    }

    this.router.navigate(['client/sincronizacao-diagrama']);
  }
}
