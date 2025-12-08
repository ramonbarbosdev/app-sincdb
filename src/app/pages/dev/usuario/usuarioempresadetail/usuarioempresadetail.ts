import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  SimpleChanges,
} from '@angular/core';
import { BaseService } from '../../../../services/base.service';
import { ZodError } from 'zod';
import { ButtonModule } from 'primeng/button';
import { FluidModule } from 'primeng/fluid';
import { InputTextModule } from 'primeng/inputtext';
import { CommonModule } from '@angular/common';
import { TabsModule } from 'primeng/tabs';
import { FormsModule } from '@angular/forms';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { TextareaModule } from 'primeng/textarea';
import { PanelModule } from 'primeng/panel';
import { LayoutCampo } from '../../../../components/layout-campo/layout-campo';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';
import { gerarSequenciaLista, getObjetoLabel } from '../../../../utils/FuncDetail';
import { Usuarioempresa } from '../../../../models/usuarioempresa';
import { UsuariosEmpresaSchema } from '../../../../schema/usuarioempresa-schema';
import { SelectModule } from 'primeng/select';
import { FlagOption } from '../../../../models/flag-option';

@Component({
  selector: 'app-usuarioempresadetail',
  imports: [
    FluidModule,
    InputTextModule,
    CommonModule,
    FormsModule,
    TabsModule,
    TableModule,
    ButtonModule,
    InputGroupModule,
    InputGroupAddonModule,
    InputNumberModule,
    TextareaModule,
    PanelModule,
    LayoutCampo,
    SelectModule,
  ],
  templateUrl: './usuarioempresadetail.html',
  styleUrl: './usuarioempresadetail.scss',
})
export class Usuarioempresadetail {
  @Input() objeto: any;
  @Input() primaryKey: string = 'id';
  @Output() objetoChange = new EventEmitter<any>();

  @Input() itemTemp: Usuarioempresa = new Usuarioempresa();
  @Input() nomeItem!: string;
  @Input() carregarDados = false;

  indexEditando: number | null = null;
  public errorValidacao: Record<string, string> = {};
  baseService = inject(BaseService);
  public endpoint = '';
  public cd_form = '';
  private cd = inject(ChangeDetectorRef);
  public listaEmpresa: FlagOption[] = [];

  public getObjetoLabel = getObjetoLabel;

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['objeto'] && this.carregarDados) {
      this.limparCampos();
      this.obterEmpresa();
    }
  }

  atualizarValor(valorAtualizado: any) {
    this.objeto = valorAtualizado;
    this.objetoChange.emit(this.objeto);
  }

  adicionarItem() {
    if (!this.objeto[this.nomeItem]) this.objeto[this.nomeItem] = [];
    if (!this.validarItens()) return;

    if (this.indexEditando != null) {
      this.objeto[this.nomeItem][this.indexEditando] = this.itemTemp;
      this.indexEditando = null;
    } else {
      if (this.objeto[this.primaryKey])
        (this.itemTemp as any)[this.primaryKey] = this.objeto[this.primaryKey];
      this.objeto[this.nomeItem].push(this.itemTemp);
    }

    this.limparCampos();
    this.objetoChange.emit(this.objeto);
  }

  validarItens(): any {
    try {
      UsuariosEmpresaSchema.parse([this.itemTemp]);
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

  limparCampos() {
    this.itemTemp = new Usuarioempresa();
    this.errorValidacao = {};
    // this.onSeq();
  }

  editarItem(index: number) {
    this.indexEditando = index;
    this.itemTemp = { ...this.objeto[this.nomeItem][index] };
  }

  removerItem(index: number) {
    this.limparCampos();
    this.objeto[this.nomeItem].splice(index, 1);
    this.objetoChange.emit(this.objeto);
  }

  // onSeq(): any {
  //   let id = this.objeto[this.primaryKey] ?? 0;
  //   this.baseService.findSequenceDetalhe(this.endpoint, id).subscribe({
  //     next: (res: any) => {
  //       let novaSequencia = gerarSequenciaLista(
  //         this.objeto,
  //         this.nomeItem,
  //         res.sequencia,
  //         this.cd_form
  //       );
  //       (this.itemTemp as any)[this.cd_form] = String(novaSequencia).padStart(3, '0');

  //       this.cd.markForCheck();
  //       return novaSequencia;
  //     },
  //     error: (err) => {},
  //   });
  // }

  processarCodigoEmpresa(event: any)
  {
    if(event)
    {
      // this.itemTemp.fl_ativo = getObjetoLabel(this.listaEmpresa, event, 'fl_ativo');
    }
  }

  obterEmpresa() {
    this.baseService.findAll(`empresa/`).subscribe({
      next: (res) => {
        this.listaEmpresa = (res as any).map((index: any) => {
          const item = new FlagOption();
          item.code = index.id_empresa;
          item.name = index.cd_empresa + ' - ' + index.nm_empresa;
           item.extra = {
             nm_empresa: index.nm_empresa,
             cd_empresa: index.cd_empresa,
           };
          this.cd.markForCheck();
          return item;
        });
      },
      error: (err) => {},
    });
  }
}
