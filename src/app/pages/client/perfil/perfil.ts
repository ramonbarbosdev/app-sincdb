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
import { getDescricaoRoleMap } from '../../../map/role.map';
import { ZodError } from 'zod';
import { NgxMaskDirective } from 'ngx-mask';
import { ButtonModule } from 'primeng/button';
import { AvatarPerfil } from "../../../components/avatar-perfil/avatar-perfil";
import { ConverterNomeRole } from '../../../utils/ConverterNomeRole';
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
  private endpoint = 'perfil';

  selectedFile: File | null = null;
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
    let login = this.auth.getUserSubbject().login;

    if (!login) {
      return;
    }

    this.baseService.findById(`${this.endpoint}`, login).subscribe({
      next: (res: any) => {
        this.objeto.id = res.id;
        this.objeto.login = res.login;
        this.objeto.nome = res.nome;
        this.objeto.role = ConverterNomeRole(res.role);
        this.objeto.cargo = res.cargo;
        this.objeto.img = res.img;
        this.cd.markForCheck();
      },
      error: (err) => {
        this.cd.markForCheck();
      },
    });
  }

  onSave() {
    if (this.validarItens()) {
      if (this.objeto.id) {
        this.baseService.update(`${this.endpoint}/`, this.objeto).subscribe({
          next: () => {
            this.auth.updateUserNome(this.objeto.nome);
            this.uploadAvatar();
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

  removerFoto() {

  }

  uploadAvatar() {
   
  }
}
