import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
} from '@angular/core';
import { CardModule } from 'primeng/card';
import { AvatarModule } from 'primeng/avatar';
import { LayoutCampo } from '../../../components/layout-campo/layout-campo';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Usuarios } from '../../../models/usuarios';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { BaseService } from '../../../services/base.service';
import { AuthService } from '../../../auth/auth.service';
import { ZodError } from 'zod';
import { NgxMaskDirective } from 'ngx-mask';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { AvatarPerfil } from '../../../components/avatar-perfil/avatar-perfil';
import { PerfilSchema } from '../../../schema/perfil-schema';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { SeasonalThemeService } from '../../../services/seasonal-theme.service';

@Component({
  selector: 'app-perfil',
  imports: [
    CardModule,
    AvatarModule,
    LayoutCampo,
    FormsModule,
    CommonModule,
    InputTextModule,
    PasswordModule,
    NgxMaskDirective,
    ButtonModule,
    AvatarPerfil,
    ToggleSwitchModule,
  ],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Perfil {
  public errorValidacao: Record<string, string> = {};
  public objeto: Usuarios = new Usuarios();

  private baseService = inject(BaseService);
  private cd = inject(ChangeDetectorRef);
  private auth = inject(AuthService);
  private seasonal = inject(SeasonalThemeService);
  private messageService = inject(MessageService);
  private endpoint = 'perfil';

  experienciasSazonais = !this.seasonal.optedOut();

  onToggleSazonal(value: boolean) {
    this.experienciasSazonais = value;
    this.seasonal.setOptOut(!value);
    this.cd.markForCheck();
  }

  ngOnInit(): void {
    this.onEdit();
  }

  onEdit() {
    const login = this.auth.getUsuarioLogin();
    this.preencherDadosSessao(login);
    this.cd.markForCheck();

    if (!login) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Perfil',
        detail: 'Não foi possível identificar o login. Faça login novamente.',
      });
      return;
    }

    this.baseService.findById(`${this.endpoint}`, login).subscribe({
      next: (res: any) => {
        this.objeto.id = res.id;
        this.objeto.login = res.login ?? login;
        this.objeto.nome = res.nome ?? this.objeto.nome;
        this.objeto.empresa = res.empresa ?? this.resolverEmpresaSessao();
        this.objeto.img = res.img ?? this.objeto.img ?? '';
        this.cd.markForCheck();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Perfil',
          detail: 'Não foi possível carregar os dados do perfil.',
        });
        this.cd.markForCheck();
      },
    });
  }

  private preencherDadosSessao(login?: string): void {
    const user = this.auth.getUserSubbject();
    if (!user) return;

    if (login) {
      this.objeto.login = login;
    }
    this.objeto.nome = user.nmUsuario ?? user.nome ?? '';
    this.objeto.empresa = this.resolverEmpresaSessao();
    this.objeto.img = user.img ?? '';
    if (user.idUsuario != null && user.idUsuario !== '') {
      this.objeto.id = user.idUsuario;
    }
  }

  onSave() {
    if (this.validarItens()) {
      if (this.objeto.id) {
        this.baseService.update(`${this.endpoint}/`, this.objeto).subscribe({
          next: () => {
            this.auth.updateUserNome(this.objeto.nome);
            if (this.objeto.img) {
              this.auth.updateUserAvatar(this.objeto.img);
            }
            this.messageService.add({
              severity: 'success',
              summary: 'Perfil',
              detail: 'Dados atualizados com sucesso.',
            });
            this.objeto.senha = '';
            this.cd.markForCheck();
          },
          error: (erro) => {
            this.cd.markForCheck();
          },
        });
      }
    }
  }

  validarItens(): boolean {
    try {
      PerfilSchema.parse([this.objeto]);
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

  onImagemChange(url: string): void {
    this.objeto.img = url;
    this.cd.markForCheck();
  }

  onRemoverFoto(): void {
    this.objeto.img = '';
    this.cd.markForCheck();
  }

  private resolverEmpresaSessao(): string {
    const user = this.auth.getUserSubbject();
    if (!user?.organizacoes?.length) return '';
    const id = user.idOrganizacao;
    const org = user.organizacoes.find(
      (item: { idOrganizacao?: string }) => item.idOrganizacao === id
    );
    return org?.nmOrganizacao ?? user.organizacoes[0]?.nmOrganizacao ?? '';
  }
}
