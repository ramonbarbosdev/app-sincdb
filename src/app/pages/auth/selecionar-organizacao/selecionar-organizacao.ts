import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
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

export type SelecionarOrganizacaoVariant = 'dialog' | 'inline';

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
export class SelecionarOrganizacao implements OnChanges {
  @Input() variant: SelecionarOrganizacaoVariant = 'dialog';
  @Input() visible: boolean = false;
  @Input() listaEmpresa: FlagOption[] = [];
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() cancel = new EventEmitter<void>();
  @Output() show = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  @Input() objeto: { idOrganizacao?: string } = {};
  private auth = inject(AuthService);
  private router = inject(Router);

  loading: boolean = false;
  private cd = inject(ChangeDetectorRef);
  public errorValidacao: Record<string, string> = {};

  ngOnChanges(): void {
    if (this.variant === 'inline' && this.listaEmpresa.length > 0) {
      this.preselectFirst();
    }
  }

  showDialog() {
    this.preselectFirst();
  }

  private preselectFirst(): void {
    if (!this.objeto.idOrganizacao && this.listaEmpresa[0]?.code) {
      this.objeto.idOrganizacao = String(this.listaEmpresa[0].code);
    }
  }

  selectOrganization(code: string | undefined): void {
    if (!code) return;
    this.objeto.idOrganizacao = code;
    this.errorValidacao = {};
  }

  onBack(): void {
    this.errorValidacao = {};
    this.loading = false;
    this.back.emit();
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

    this.auth.selecionarOrganizacao(this.objeto.idOrganizacao!).subscribe({
      next: () => {
        this.loading = false;
        if (this.variant === 'dialog') {
          this.visible = false;
        }
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
    this.router.navigate(this.auth.getDefaultAppRoute());
  }

  validarItens(): boolean {
    this.errorValidacao = {};
    if (!this.objeto.idOrganizacao) {
      this.errorValidacao['idOrganizacao'] = 'Selecione uma organização';
      return false;
    }

    return true;
  }
}
