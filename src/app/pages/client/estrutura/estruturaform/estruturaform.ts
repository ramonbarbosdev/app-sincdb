import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { LayoutCampo } from '../../../../components/layout-campo/layout-campo';
import { SelectModule } from 'primeng/select';
import { Estruturas } from '../../../../models/estruturas';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseService } from '../../../../services/base.service';
import { FlagOption } from '../../../../models/flag-option';
import { ButtonModule } from 'primeng/button';
import { ZodError } from 'zod';
import { EstruturaSchema } from '../../../../schema/estrutura-schema';
import { SyncProgressoBar } from '../../../../components/sync-progresso-bar/sync-progresso-bar';
import { ProgressoSyncService } from '../../../../services/progresso-sync-service';
import { SyncErros } from '../../../../components/sync-erros/sync-erros';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-estruturaform',
  imports: [
    CardModule,
    LayoutCampo,
    SelectModule,
    CommonModule,
    FormsModule,
    ButtonModule,
    SyncProgressoBar,
    SyncErros,
  ],
  templateUrl: './estruturaform.html',
  styleUrl: './estruturaform.scss',
})
export class Estruturaform {
  public objeto: Estruturas = new Estruturas();
  private baseService = inject(BaseService);
  public errorValidacao: Record<string, string> = {};

  public listaBase: FlagOption[] = [];
  public listaEsquema: FlagOption[] = [];
  public listaTabela: FlagOption[] = [];

  public listaErros: any[] = [];

  private cd = inject(ChangeDetectorRef);
  private progressoSync = inject(ProgressoSyncService);
  private messageService = inject(MessageService);

  router = inject(Router);

  loadingBase = true;
  loadingEsquema = false;
  loadingTabela = false;
  loadingVerificacao = false;
  loadingSincronizacao = false;

  ngOnInit() {
    this.progressoSync.vazioProgressoLocal();
    this.obterBase();
  }

  processarBase(item: any) {
    if (!item) return;

    this.obterEsquema(item);
  }

  processarEsquema(item: any) {
    if (!item) return;

    this.obterTabela(item);
  }

  obterBase() {
    this.baseService.findAll(`sincronizacao/bases/`).subscribe({
      next: (res) => {
        this.listaBase = (res as any).map((index: any) => {
          const item = new FlagOption();
          item.code = index;
          item.name = index;
          this.cd.markForCheck();
          return item;
        });

        this.loadingBase = false;
      },
      error: (err) => {
        this.loadingBase = false;
      },
    });
  }

  obterEsquema(item: any) {
    this.loadingEsquema = true;

    this.baseService.findAll(`sincronizacao/base/esquema/${item}`).subscribe({
      next: (res) => {
        this.listaEsquema = (res as any).map((index: any) => {
          const item = new FlagOption();
          item.code = index;
          item.name = index;
          this.cd.markForCheck();
          return item;
        });

        if (this.listaEsquema?.length) {
          this.objeto.esquema = String(this.listaEsquema[this.listaEsquema.length - 1].code);
          this.obterTabela(this.objeto.esquema);
        }

        this.loadingEsquema = false;
      },
      error: (err) => {
        this.loadingEsquema = false;
      },
    });
  }

  obterTabela(item: any) {
    this.loadingTabela = true;

    let base = this.objeto.base;
    let esquema = item;

    if (base && item)
      this.baseService.findAll(`sincronizacao/base/tabela/${base}/${esquema}`).subscribe({
        next: (res) => {
          this.listaTabela = (res as any).map((index: any) => {
            const item = new FlagOption();
            item.code = index;
            item.name = index;
            this.cd.markForCheck();
            return item;
          });

          this.loadingTabela = false;
        },
        error: (err) => {
          this.loadingTabela = false;
        },
      });
  }

  validarItens(): boolean {
    try {
      EstruturaSchema.parse([this.objeto]);
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

  verificar() {
    if (!this.validarItens()) return;

    this.listaErros = [];

    let base = this.objeto.base;
    let esquema = this.objeto.esquema;

    this.baseService.findAll(`sincronizacao/verificaesquema/${base}/${esquema}`).subscribe({
      next: (res) => {
        let tabelaEsquema = !this.objeto.tabela ? this.objeto.esquema : this.objeto.tabela;
        this.continuarVerificacao(tabelaEsquema);
      },
      error: (err) => {},
    });
  }

  continuarVerificacao(tabela: string) {
    if (!tabela) return;

    let base = this.objeto.base;
    let esquema = this.objeto.esquema;

    this.loadingVerificacao = true;
    this.loadingSincronizacao = true;

    this.progressoSync.iniciarGenericoProgressoLocal();

    this.baseService.findAll(`estrutura/verificar/${base}/${esquema}/${tabela}`).subscribe({
      next: (res) => {
        // this.progressoSync.verificacaoConcluidaProgressoLocal();
        this.loadingVerificacao = false;
        this.loadingSincronizacao = false;
      },
      error: (err) => {
        this.loadingVerificacao = false;
        this.loadingSincronizacao = true;
      },
    });
  }

  verificarEExecutar() {
    if (!this.validarItens()) return;
    this.listaErros = [];

    const base = this.objeto.base;
    const esquema = this.objeto.esquema;
    const tabela = !this.objeto.tabela ? this.objeto.esquema : this.objeto.tabela;

    this.loadingVerificacao = true;
    this.loadingSincronizacao = true;

    this.progressoSync.iniciarGenericoProgressoLocal();

    this.baseService.findAll(`estrutura/verificar/${base}/${esquema}/${tabela}`).subscribe({
      next: () => {
        this.loadingVerificacao = false;
        this.execultarSincronizacao();
      },
      error: () => {
        this.loadingVerificacao = false;
        this.loadingSincronizacao = false;
        // this.progressoSync.atualizarMensagem('Verificação falhou');
      },
    });
  }

  execultarSincronizacao() {
    if (!this.validarItens()) return;

    let base = this.objeto.base;

    this.loadingSincronizacao = true;
    this.loadingVerificacao = true;

    this.progressoSync.iniciarGenericoProgressoLocal();

    this.baseService.findAll(`estrutura/${base}`).subscribe({
      next: (res) => {
        this.loadingSincronizacao = false;
        this.loadingVerificacao = false;

        if (res.errors.length > 0) {
          this.listaErros = res.errors ?? [];
          return;
        }

        this.router.navigate(['client/home']);

        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Sincronização finalizada!',
        });
      },
      error: (err) => {
        this.loadingSincronizacao = false;
        this.loadingVerificacao = false;
      },
    });
  }

  cancelarSincronizacao() {
    this.baseService.findAll(`estrutura/cancelar`).subscribe({
      next: (resposta: any) => {
        this.progressoSync.resetar();
        this.loadingSincronizacao = false;
        this.loadingVerificacao = false;
      },
    });
  }

  ngOnDestroy() {
    this.listaErros = [];
    this.cancelarSincronizacao();
    this.progressoSync.vazioProgressoLocal();
  }
}
