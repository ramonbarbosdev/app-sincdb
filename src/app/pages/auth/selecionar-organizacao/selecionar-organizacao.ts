import { ChangeDetectorRef, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FlagOption } from '../../../models/flag-option';
import { SelectModule } from 'primeng/select';
import { LayoutCampo } from '../../../components/layout-campo/layout-campo';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../auth/auth.service';
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
  ],
  templateUrl: './selecionar-organizacao.html',
  styleUrl: './selecionar-organizacao.scss',
})
export class SelecionarOrganizacao {
  @Input() visible: boolean = false;
  @Input() listaEmpresa: FlagOption[] = [];
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() cancel = new EventEmitter<void>();
  @Output() show = new EventEmitter<void>();

  @Input() objeto: any;
  private auth = inject(AuthService);
  private router = inject(Router);

  loading: boolean = false;
  private cd = inject(ChangeDetectorRef);
  public errorValidacao: Record<string, string> = {};

  showDialog() {
    this.objeto.idOrganizacao = String(this.listaEmpresa[0]?.code ?? '');
  }

  hideDialog() {
    this.visible = false;
    this.visibleChange.emit(this.visible);
    this.cancel.emit();
    this.loading = false;
  }

  selecionar() {
    if (!this.validarItens()) return;
    this.loading = true;

    this.auth.selecionarOrganizacao(this.objeto.idOrganizacao).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.visible = false;
        this.gerenciarRotaUsuario();
        this.cd.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cd.markForCheck();
      },
    });
  }

  gerenciarRotaUsuario() {
    if (this.auth.getRoleOrganizacaoAtiva() === 'ROLE_DEV') {
      this.router.navigate(['dev/home']);
      return;
    }
    this.router.navigate(['client/sincronizacao-diagrama']);
  }

  validarItens(): any {
    this.errorValidacao = {};
    if (!this.objeto.idOrganizacao) {
      this.errorValidacao['idOrganizacao'] = 'Selecione uma organizacao';
      return false;
    }

    return true;
  }
}
