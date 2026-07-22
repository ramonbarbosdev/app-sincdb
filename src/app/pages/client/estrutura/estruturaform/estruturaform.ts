import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { LayoutCampo } from '../../../../components/layout-campo/layout-campo';
import { SelectModule } from 'primeng/select';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseService } from '../../../../services/base.service';
import { FlagOption } from '../../../../models/flag-option';
import { ButtonModule } from 'primeng/button';
import { ZodError } from 'zod';
import { SyncProgressoBar } from '../../../../components/sync-progresso-bar/sync-progresso-bar';
import { ProgressoSyncService } from '../../../../services/progresso-sync-service';
import { SyncErros } from '../../../../components/sync-erros/sync-erros';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Operacao } from '../../../../models/operacao';
import { OperacoeSchema } from '../../../../schema/operacao-schema';
import { SyncConsole } from "../../../../components/sync-console/sync-console";
import { WebsocketService } from '../../../../services/websocket.service';
import { EstruturaPreview, EstruturaResponse } from "../../../../components/estrutura-preview/estrutura-preview";
import { Conexao } from '../../../../models/conexao';

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
    SyncConsole,
    EstruturaPreview
  ],
  templateUrl: './estruturaform.html',
  styleUrl: './estruturaform.scss',
})
export class Estruturaform {
  public objeto: Operacao = new Operacao();
  private baseService = inject(BaseService);
  public errorValidacao: Record<string, string> = {};

  public listaBase: FlagOption[] = [];
  public listaEsquema: FlagOption[] = [];
  public listaTabela: FlagOption[] = [];

  public listaErros: any[] = [];
  public response: any;

  private cd = inject(ChangeDetectorRef);
  private progressoSync = inject(ProgressoSyncService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private ws = inject(WebsocketService);
  router = inject(Router);
  endpointPrincipal = 'estrutura'

  visibleDetail = false;


  loadingBase = true;
  loadingEsquema = false;
  loadingTabela = false;
  loadingVerificacao = false;
  loadingSincronizacao = false;
  loadingConexaoPadrao = false;
  conexaoPadrao?: Conexao;
  private syncStartedAt = 0;

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

  abrirDetalhes() {
    this.visibleDetail = true;
  }

  irParaConexao() {
    this.router.navigate(['/client/conexao']);
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
        this.conexaoPadrao = this.normalizarConexaoPadrao(
          lista.find((item: Conexao) => item.fl_padrao) || lista[0]
        );
        this.loadingConexaoPadrao = false;
        this.cd.markForCheck();
      },
      error: () => {
        this.loadingConexaoPadrao = false;
        this.cd.markForCheck();
      },
    });
  }

  private normalizarConexaoPadrao(conexao: any): Conexao | undefined {
    if (!conexao) {
      return undefined;
    }

    return {
      ...conexao,
      db_cloud_host: conexao.db_cloud_host ?? conexao.cloud?.db_cloud_host ?? '',
      db_cloud_port: conexao.db_cloud_port ?? conexao.cloud?.db_cloud_port ?? '',
      db_cloud_user: conexao.db_cloud_user ?? conexao.cloud?.db_cloud_user ?? '',
      db_cloud_password: conexao.db_cloud_password ?? conexao.cloud?.db_cloud_password ?? '',
      fl_admin: conexao.fl_admin ?? conexao.cloud?.fl_admin ?? false,
      db_local_host: conexao.db_local_host ?? conexao.local?.db_local_host ?? '',
      db_local_port: conexao.db_local_port ?? conexao.local?.db_local_port ?? '',
      db_local_user: conexao.db_local_user ?? conexao.local?.db_local_user ?? '',
      db_local_password: conexao.db_local_password ?? conexao.local?.db_local_password ?? '',
    } as Conexao;
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
          if (this.listaEsquema?.length > 1 ) {
            this.objeto.esquema = String(this.listaEsquema[this.listaEsquema.length - 2].code);
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
    if (!this.conexaoPadrao || !this.validarItens()) return;

    this.listaErros = [];
    this.syncStartedAt = Date.now();

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
          this.response = res;
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
    if (!this.conexaoPadrao || !this.validarItens()) return;
    this.listaErros = [];
    this.syncStartedAt = Date.now();

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
          this.execultarSincronizacao(true);
        },
        error: (err) => {
          console.log(err)
          this.loadingVerificacao = false;
          this.loadingSincronizacao = false;
        },
      });
  }

  execultarSincronizacao(jaIniciado = false) {
    if (!this.conexaoPadrao || !this.validarItens()) return;

    let base = this.objeto.base;
    let esquema = this.objeto.esquema;

    if (!jaIniciado) {
      this.syncStartedAt = Date.now();
      this.progressoSync.iniciarGenericoProgressoLocal();
    }

    this.loadingSincronizacao = true;
    this.loadingVerificacao = true;

    this.baseService.findAll(`${this.endpointPrincipal}/${base}/${esquema}`).subscribe({
      next: (res) => {
        this.loadingSincronizacao = false;
        this.loadingVerificacao = false;

        if (res.errors?.length > 0) {
          this.listaErros = res.errors ?? [];
          this.messageService.add({
            severity: 'warn',
            summary: 'Sincronização com pendências',
            detail: `${this.listaErros.length} erro(s) em ${base}.${esquema} — veja o painel abaixo.`,
          });
          return;
        }

        const duracaoMs = Date.now() - (this.syncStartedAt || Date.now());
        const resumo = this.objeto.tabela
          ? `${base} / ${esquema} / ${this.objeto.tabela}`
          : `${base} / ${esquema}`;
        const secs = Math.max(1, Math.round(duracaoMs / 1000));

        this.progressoSync.marcarConcluido({
          mensagem: 'Estrutura alinhada',
          resumo,
          duracaoMs,
        });

        this.messageService.add({
          severity: 'success',
          summary: 'Estrutura alinhada',
          detail: `${resumo} · ${secs}s`,
        });

        setTimeout(() => this.oferecerSincronizacaoDados(), 500);
      },
      error: (err) => {
        this.loadingSincronizacao = false;
        this.loadingVerificacao = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Falha na estrutura',
          detail: `Não foi possível sincronizar ${base}.${esquema}.`,
        });
      },
    });
  }

  private oferecerSincronizacaoDados() {
    const state: { base: string; esquema: string; tabela?: string } = {
      base: this.objeto.base,
      esquema: this.objeto.esquema,
    };

    if (this.objeto.tabela) {
      state.tabela = this.objeto.tabela;
    }

    const escopo = this.objeto.tabela
      ? `${this.objeto.base} / ${this.objeto.esquema} / ${this.objeto.tabela}`
      : `${this.objeto.base} / ${this.objeto.esquema}`;

    this.confirmationService.confirm({
      message: `Estrutura sincronizada. Deseja sincronizar os dados agora (${escopo})?`,
      header: 'Próximo passo',
      icon: 'pi pi-database',
      acceptLabel: 'Sincronizar dados',
      rejectLabel: 'Agora não',
      accept: () =>
        this.router.navigate(['/client/dados'], {
          state,
        }),
      reject: () => this.router.navigate(['/client/home']),
    });
  }

  cancelarSincronizacao() {
    this.baseService.findAll(`${this.endpointPrincipal}/cancelar`).subscribe({
      next: (resposta: any) => {
        this.listaErros = [];
        this.response = null;
        this.progressoSync.resetar();
        this.ws.emitClearTerminal();
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
