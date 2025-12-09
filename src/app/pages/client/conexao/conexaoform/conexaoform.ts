import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { AvatarModule } from 'primeng/avatar';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ZodError } from 'zod';
import { ButtonModule } from 'primeng/button';
import { LayoutCampo } from '../../../../components/layout-campo/layout-campo';
import { AuthService } from '../../../../auth/auth.service';
import { BaseService } from '../../../../services/base.service';
import { ConexaoSchema } from '../../../../schema/conexao-schema';
import { Conexao } from '../../../../models/conexao';
import { Router } from '@angular/router';
import { UploadCertiicado } from "../upload-certiicado/upload-certiicado";
import { ToggleSwitchModule } from 'primeng/toggleswitch';

@Component({
  selector: 'app-conexaoform',
  imports: [
    CardModule,
    AvatarModule,
    LayoutCampo,
    FormsModule,
    CommonModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    UploadCertiicado,
    ToggleSwitchModule,
  ],
  templateUrl: './conexaoform.html',
  styleUrl: './conexaoform.scss',
})
export class Conexaoform {
  public errorValidacao: Record<string, string> = {};
  public objeto: Conexao = new Conexao();

  private baseService = inject(BaseService);
  private cd = inject(ChangeDetectorRef);
  private auth = inject(AuthService);
  private endpoint = 'conexao';
  router = inject(Router);

  public cloud = {
    db_cloud_host: '',
    db_cloud_port: '',
    db_cloud_user: '',
    db_cloud_password: '',
    fl_admin: false,
  };
  public local = {
    db_local_host: '',
    db_local_port: '',
    db_local_user: '',
    db_local_password: '',
  };

  ngOnInit(): void {
    this.objeto.login = this.auth.getUserSubbject().login ?? '';
    this.onEdit();
  }

  onEdit() {
    let login = this.auth.getUserSubbject().login;

    if (!login) {
      return;
    }

    this.baseService.findById(`${this.endpoint}`, login).subscribe({
      next: (res: any) => {
        if (res) {
          this.objeto.arquivoValidado = res.cloud.fl_admin;
          this.objeto.id_conexao = res.id;
          this.cloud = res.cloud;
          this.local = res.local;
        }
        this.cd.markForCheck();
      },
      error: (err) => {
        this.cd.markForCheck();
      },
    });
  }

  onSave() {
    const payload = {
      id: this.objeto.id_conexao,
      cloud: this.cloud,
      local: this.local,
      login: this.objeto.login,
    };

    if (this.validarItens()) {
      if (this.objeto.id_conexao) {
        this.baseService.update(`${this.endpoint}/`, payload).subscribe({
          next: (res: any) => {
            this.router.navigate(['client/home']);
          },
          error: (err) => {},
        });
      } else {
        this.baseService.create(`${this.endpoint}/`, payload).subscribe({
          next: (res: any) => {
            this.objeto.id_conexao = res.id_conexao;

            this.router.navigate(['client/home']);
          },
          error: (err) => {},
        });
      }
    }
  }

  validarItens(): boolean {
    try {
      ConexaoSchema.parse([this.objeto]);
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

  onCertificadoEnviado(ok: boolean) {
    this.objeto.arquivoValidado = ok;
    this.onEdit();
  }
}
