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
import { extractApiErrorMessage } from '../../../utils/api-error-message';
import { copyTextToClipboard } from '../../../utils/copy-to-clipboard';

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
  apiErrorCopied = false;
  copyErrorLabel = 'Copiar erro';

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
    this.apiErrorCopied = false;
    this.objeto.idOrganizacao = undefined;
    this.listaEmpresa = [];
    this.auth.clearSession();
    this.cd.markForCheck();
  }

  entrar() {
    if (!this.validarItens()) return;

    this.loading = true;
    this.apiError = null;
    this.apiErrorCopied = false;
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
        this.apiError = extractApiErrorMessage(
          err,
          'Não foi possível entrar. Verifique CPF e senha.'
        );
        this.loginStep = 'credentials';
        this.loading = false;
        this.cd.markForCheck();
      },
    });
  }

  async copiarErroApi(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (!this.apiError) {
      return;
    }
    const copied = await copyTextToClipboard(this.apiError);
    if (!copied) {
      return;
    }
    this.apiErrorCopied = true;
    this.copyErrorLabel = 'Copiado';
    this.cd.markForCheck();
    window.setTimeout(() => {
      this.apiErrorCopied = false;
      this.copyErrorLabel = 'Copiar erro';
      this.cd.markForCheck();
    }, 2000);
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
    if (!this.auth.temOrganizacaoSelecionada()) {
      return;
    }

    this.auth.checkAuth().subscribe({
      next: () => this.redirecionarPorOrganizacaoAtiva(),
      error: () => {
        if (this.auth.temOrganizacaoSelecionada()) {
          this.redirecionarPorOrganizacaoAtiva();
        }
      },
    });
  }

  redirecionarPorOrganizacaoAtiva() {
    this.router.navigate(this.auth.getDefaultAppRoute());
  }
}
