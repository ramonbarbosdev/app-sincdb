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
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { BaseService } from '../../../../services/base.service';
import { ZodError } from 'zod';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Roles } from '../../../../models/roles';
import { LayoutFormSimples } from '../../../../components/layouts/layout-form-simples/layout-form-simples';
import { TabsModule } from 'primeng/tabs';
import { LayoutCampo } from '../../../../components/layout-campo/layout-campo';
import { Rotapermission } from '../../../../models/rotapermission';
import { Rotapermissiondetail } from '../rotapermissiondetail/rotapermissiondetail';
import { ToggleButton } from 'primeng/togglebutton';
import { ConverterNomeRole } from '../../../../utils/ConverterNomeRole';
import { PanelModule } from 'primeng/panel';
import { RoleSchema } from '../../../../schema/role-schema';

@Component({
  selector: 'app-roleform',
  // standalone: true,
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
    LayoutFormSimples,
    TabsModule,
    LayoutCampo,
    Rotapermissiondetail,
    ToggleButton,
    PanelModule,
  ],
  templateUrl: './roleform.html',
  styleUrl: './roleform.scss',
})
export class Roleform {
  @Input() isDialog: boolean = true;
  @Output() isDialogChange = new EventEmitter<boolean>();
  @Input() onReloadList: () => void = () => {};
  @Input() key!: number;

  loading: boolean = true;
  public objeto: Roles = new Roles();
  public itensRotaPermission: Rotapermission = new Rotapermission();
  listaRotas: any[] = [];
  public errorValidacao: Record<string, string> = {};
  private endpoint = 'role';
  private baseService = inject(BaseService);
  private cd = inject(ChangeDetectorRef);

  carregarDetalhes = false;

  isMobile: boolean = false;
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isDialog']) {
      this.checkScreen();
      window.addEventListener('resize', () => this.checkScreen());
    }
  }
  checkScreen() {
    this.isMobile = window.innerWidth < 450;
  }

  hideDialog() {
    this.isDialog = false;
    this.isDialogChange.emit(false);
    this.limparFormulario();
    this.carregarDetalhes = false;
  }

  onAddFormChange(lista: any[]) {
  }

  onShow() {
    this.loading = true;
    this.limparFormulario();

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
        this.objeto = res;
        this.objeto.nomeRole = ConverterNomeRole(this.objeto.nomeRole);
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
      this.baseService
        .create(`${this.endpoint}/cadastrar`, this.objeto)
        .subscribe({
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
      RoleSchema.parse([this.objeto]);
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
    this.objeto = new Roles();
    this.errorValidacao = {};
  }

  processarPreDefinicao(event: any, endpoint?:string) {
    if (event) 
      this.obterRotasPredefinidas();
    
  }
  processarPreDefinicaoGeral(event: any) {
     if (event) 
      this.obterRotasPredefinidasGeral();
    
  }
  processarPreDefinicaoCliente(event: any) {
    if (event) {
      this.obterRotasPredefinidasCliente()
    }
  }
  processarPreDefinicaoProjeto(event: any) {
    if (event) {
      this.obterRotasPredefinidasProjeto()
    }
  }
  processarPreDefinicaoLimpeza(event: any) {
    if (event) {
       this.objeto.itensRotaPermission = [];
    }
  }

  obterRotasPredefinidas() {
    if (this.objeto.id) return;

    this.baseService.findAll('rotas/predefinida').subscribe({
      next: (res: any[]) => {
        const novaListagem: Rotapermission[] = (res || []).map((item: any) => {
          const rota = new Rotapermission();
          Object.assign(rota, item);
          return rota;
        });

        this.objeto.itensRotaPermission = [
          ...(this.objeto.itensRotaPermission || []),
          ...novaListagem,
        ];

        this.loading = false;
        this.cd.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cd.markForCheck();
      },
    });
  }
  obterRotasPredefinidasGeral() {
    if (this.objeto.id) return;

    this.baseService.findAll('rotas/predefinida-geral').subscribe({
      next: (res: any[]) => {
        const novaListagem: Rotapermission[] = (res || []).map((item: any) => {
          const rota = new Rotapermission();
          Object.assign(rota, item);
          return rota;
        });

        this.objeto.itensRotaPermission = [
          ...(this.objeto.itensRotaPermission || []),
          ...novaListagem,
        ];

        this.loading = false;
        this.cd.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cd.markForCheck();
      },
    });
  }
  obterRotasPredefinidasCliente() {
    if (this.objeto.id) return;

    this.baseService.findAll('rotas/predefinida-cliente').subscribe({
      next: (res: any[]) => {
        const novaListagem: Rotapermission[] = (res || []).map((item: any) => {
          const rota = new Rotapermission();
          Object.assign(rota, item);
          return rota;
        });

        this.objeto.itensRotaPermission = [
          ...(this.objeto.itensRotaPermission || []),
          ...novaListagem,
        ];

        this.loading = false;
        this.cd.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cd.markForCheck();
      },
    });
  }
  obterRotasPredefinidasProjeto() {
    if (this.objeto.id) return;

    this.baseService.findAll('rotas/predefinida-projeto').subscribe({
      next: (res: any[]) => {
        const novaListagem: Rotapermission[] = (res || []).map((item: any) => {
          const rota = new Rotapermission();
          Object.assign(rota, item);
          return rota;
        });

        this.objeto.itensRotaPermission = [
          ...(this.objeto.itensRotaPermission || []),
          ...novaListagem,
        ];

        this.loading = false;
        this.cd.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cd.markForCheck();
      },
    });
  }
}
