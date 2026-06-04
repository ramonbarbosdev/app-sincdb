import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { Operacao } from '../../../models/operacao';
import { BaseService } from '../../../services/base.service';
import { FlagOption } from '../../../models/flag-option';
import { MessageService } from 'primeng/api';
import { ProgressoSyncService } from '../../../services/progresso-sync-service';
import { Router } from '@angular/router';
import { ZodError } from 'zod';
import { OperacoeSchema } from '../../../schema/operacao-schema';
import { CardModule } from 'primeng/card';
import { LayoutCampo } from '../../../components/layout-campo/layout-campo';
import { SelectModule } from 'primeng/select';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SyncProgressoBar } from '../../../components/sync-progresso-bar/sync-progresso-bar';
import { SyncErros } from '../../../components/sync-erros/sync-erros';
import { SyncConsole } from "../../../components/sync-console/sync-console";
import { WebsocketService } from '../../../services/websocket.service';
import { Conexao } from '../../../models/conexao';

@Component({
  selector: 'app-dadosform',
  imports: [
    CardModule,
    LayoutCampo,
    SelectModule,
    CommonModule,
    FormsModule,
    ButtonModule,
    SyncProgressoBar,
    SyncErros,
    SyncConsole
  ],
  templateUrl: './dadosform.html',
  styleUrl: './dadosform.scss',
})
export class Dadosform {
  public objeto: Operacao = new Operacao();
  private baseService = inject(BaseService);
  public errorValidacao: Record<string, string> = {};

  public listaBase: FlagOption[] = [];
  public listaEsquema: FlagOption[] = [];
  public listaTabela: FlagOption[] = [];

  public listaErros: any[] = [];

  private cd = inject(ChangeDetectorRef);
  private progressoSync = inject(ProgressoSyncService);
  private messageService = inject(MessageService);
  private ws = inject(WebsocketService);

  endpointPrincipal = 'dados';

  router = inject(Router);

  loadingBase = true;
  loadingEsquema = false;
  loadingTabela = false;
  loadingVerificacao = false;
  loadingSincronizacao = false;
  loadingConexaoPadrao = false;
  conexaoPadrao?: Conexao;

  ngOnInit() {
    this.progressoSync.vazioProgressoLocal();
    this.obterConexaoPadrao();
    this.obterBase();

    //atalho
    const state = history.state;
    if (state.base) {

      this.objeto.base = state.base;
      this.processarBase(this.objeto.base);

    }
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

  obterConexaoPadrao() {
    this.loadingConexaoPadrao = true;
    this.baseService.findAll('conexao').subscribe({
      next: (res: any) => {
        const lista = Array.isArray(res) ? res : res?.conexoes || res?.items || res?.content || [];
        this.conexaoPadrao = lista.find((item: Conexao) => item.fl_padrao) || lista[0];
        this.loadingConexaoPadrao = false;
        this.cd.markForCheck();
      },
      error: () => {
        this.loadingConexaoPadrao = false;
        this.cd.markForCheck();
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

        //atalho
        const state = history.state;

        if (state.esquema) {
          this.objeto.esquema = state.esquema;
        }
        else {
          if (this.listaEsquema?.length) {
            this.objeto.esquema = String(this.listaEsquema[this.listaEsquema.length - 1].code);
            this.obterTabela(this.objeto.esquema);
          }
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
      OperacoeSchema.parse([this.objeto]);
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
      error: (err) => { },
    });
  }

  continuarVerificacao(tabela: string) {
    if (!tabela) return;

    let base = this.objeto.base;
    let esquema = this.objeto.esquema;

    this.loadingVerificacao = true;
    this.loadingSincronizacao = true;

    this.progressoSync.iniciarGenericoProgressoLocal();

    this.baseService
      .findAll(`${this.endpointPrincipal}/verificar/${base}/${esquema}/${tabela}`)
      .subscribe({
        next: (res) => {
          // this.progressoSync.verificacaoConcluidaProgressoLocal();
          this.loadingVerificacao = false;
          this.loadingSincronizacao = false;
        },
        error: (err) => {
          this.loadingSincronizacao = false;
          this.loadingVerificacao = false;
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

    this.baseService
      .findAll(`${this.endpointPrincipal}/verificar/${base}/${esquema}/${tabela}`)
      .subscribe({
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
    let esquema = this.objeto.esquema;

    this.loadingSincronizacao = true;
    this.loadingVerificacao = true;

    this.progressoSync.iniciarGenericoProgressoLocal();

    this.baseService.findAll(`${this.endpointPrincipal}/${base}/${esquema}`).subscribe({
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
    this.baseService.findAll(`${this.endpointPrincipal}/cancelar`).subscribe({
      next: (resposta: any) => {
        this.listaErros = [];
        this.ws.emitClearTerminal();
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
