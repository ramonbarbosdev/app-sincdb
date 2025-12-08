import { ChangeDetectorRef, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { BaseService } from '../../../services/base.service';
import { FlagOption } from '../../../models/flag-option';
import { SelectModule } from 'primeng/select';
import { LayoutCampo } from '../../../components/layout-campo/layout-campo';
import { Auth } from '../../../models/auth';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../auth/auth.service';
import { LoginSchema } from '../../../schema/login-schema';
import { ZodError } from 'zod';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TipoRole } from '../../../enum/TipoRole';
import { Router } from '@angular/router';

@Component({
  selector: 'app-selecionar-organizacao',
  imports: [
    DialogModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    LayoutCampo,
    CommonModule,
    FormsModule,
    ToggleSwitchModule,
  ],
  templateUrl: './selecionar-organizacao.html',
  styleUrl: './selecionar-organizacao.scss',
})
export class SelecionarOrganizacao {
  @Input() visible: boolean = false;
  @Input() listaEmpresa: any[] = [];
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() cancel = new EventEmitter<void>();
  @Output() show = new EventEmitter<void>();

  @Input() objeto: any;
  private baseService = inject(BaseService);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading: boolean = false;
  private cd = inject(ChangeDetectorRef);
  public errorValidacao: Record<string, string> = {};

  showDialog() {
        this.objeto.id_tenant = String(this.listaEmpresa[0].code);
  }

  hideDialog() {
    this.visible = false;
    this.visibleChange.emit(this.visible);
    this.cancel.emit();
    this.loading = false;
  }

  login() {
    if (!this.validarItens()) return;
    this.loading = true;

    this.auth.login(this.objeto).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.visible = false;
        this.gerenciarRotaUsuario(res);
      },
      error: (err) => {
        this.loading = false;
      },
    });
  }

  gerenciarRotaUsuario(res: any) {

    if (this.objeto.isAreaDev) {
      this.router.navigate(['dev/home']);
      return;
    }
    this.router.navigate(['client/home']);
  }

  getVerificarPermissao() {
    if (TipoRole.ROLE_DEV === this.objeto.role) {
      return true;
    }
    return false;
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
}
