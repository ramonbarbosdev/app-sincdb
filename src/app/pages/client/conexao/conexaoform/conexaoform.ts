import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ZodError } from 'zod';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { finalize, timeout } from 'rxjs';
import { LayoutCampo } from '../../../../components/layout-campo/layout-campo';
import { BaseService } from '../../../../services/base.service';
import { ConexaoSchema } from '../../../../schema/conexao-schema';
import { Conexao } from '../../../../models/conexao';
import { UploadCertiicado } from '../upload-certiicado/upload-certiicado';
import { TabsModule } from 'primeng/tabs';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-conexaoform',
  imports: [
    CardModule,
    LayoutCampo,
    FormsModule,
    CommonModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    DialogModule,
    TableModule,
    TagModule,
    ToggleSwitchModule,
    TooltipModule,
    UploadCertiicado,
    TabsModule,
  ],
  templateUrl: './conexaoform.html',
  styleUrl: './conexaoform.scss',
})
export class Conexaoform {
  public errorValidacao: Record<string, string> = {};
  public listaConexoes: Conexao[] = [];
  public objeto: Conexao = new Conexao();
  public dialogVisible = false;
  public loading = false;
  public salvando = false;
  public testandoConexao = false;
  public carregandoConexao = false;
  public senhaCloudDefinida = false;
  public senhaCloudSshDefinida = false;
  public senhaLocalSshDefinida = false;
  public abaDialogConexao: 'conexao' | 'ssh' | 'admin' = 'conexao';

  private baseService = inject(BaseService);
  private http = inject(HttpClient);
  private cd = inject(ChangeDetectorRef);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private router = inject(Router);
  private endpoint = 'conexao';

  ngOnInit(): void {
    this.carregarConexoes();
  }

  carregarConexoes() {
    this.loading = true;
    this.baseService.findAll(this.endpoint).subscribe({
      next: (res: any) => {
        this.listaConexoes = this.normalizarConexoes(res);
        this.loading = false;
        this.cd.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Não foi possível carregar as conexões.',
        });
        this.cd.markForCheck();
      },
    });
  }

  novaConexao() {
    this.objeto = new Conexao();
    this.objeto.fl_padrao = this.listaConexoes.length === 0;
    this.limparEstadoSenhas();
    this.errorValidacao = {};
    this.abaDialogConexao = 'conexao';
    this.dialogVisible = true;
  }


  editarConexao(conexao: Conexao) {
    const id = this.obterIdConexao(conexao);

    if (!id) {
      return;
    }

    this.carregandoConexao = true;

    this.baseService.findById(this.endpoint, id).subscribe({
      next: (res: any) => {
        this.objeto = this.normalizarConexao(res);
        this.aplicarEstadoSenhas(this.objeto);
        this.errorValidacao = {};
        this.abaDialogConexao = this.definirAbaInicialDialog(this.objeto);
        this.dialogVisible = true;
        this.carregandoConexao = false;
        this.cd.markForCheck();
      },
      error: () => {
        this.carregandoConexao = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Não foi possível carregar a conexão.',
        });
        this.cd.markForCheck();
      }
    });
  }
  salvarConexao() {
    if (!this.validarItens()) {
      return;
    }

    const payload = this.montarPayload(this.objeto);
    const id = this.obterIdConexao(this.objeto);

    this.salvando = true;
    const request = id
      ? this.baseService.update(`${this.endpoint}/`, payload)
      : this.baseService.create(`${this.endpoint}/`, payload);

    request.subscribe({
      next: () => {
        this.salvando = false;
        this.dialogVisible = false;
        this.carregarConexoes();
        this.messageService.add({
          severity: 'success',
          summary: 'Conexão pronta',
          detail: this.objeto.nm_conexao
            ? `"${this.objeto.nm_conexao}" salva e disponível para sync.`
            : 'Conexão salva e disponível para sync.',
        });
        this.oferecerSincronizacaoEstrutura();
      },
      error: () => {
        this.salvando = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Não foi possível salvar',
          detail: 'Verifique os dados da conexão Cloud/Local e tente de novo.',
        });
        this.cd.markForCheck();
      },
    });
  }

  testarConexao() {
    const payload = this.montarPayload(this.objeto);

    this.testandoConexao = true;

    this.http
      .post(`${environment.apiUrl}/conexao/testar`, payload)
      .pipe(
        timeout(60000),
        finalize(() => {
          this.testandoConexao = false;
          this.cd.markForCheck();
        })
      )
      .subscribe({
        next: (res: any) => {
          if (res?.ok) {
            this.messageService.add({
              severity: 'success',
              summary: 'Conexão OK',
              detail: res.message || 'Cloud e Local conectados com sucesso.',
            });
          } else {
            this.messageService.add({
              severity: 'warn',
              summary: 'Teste com falhas',
              detail: this.formatarResultadoTeste(res),
            });
          }
        },
        error: (error) => {
          if (error?.name === 'TimeoutError') {
            this.messageService.add({
              severity: 'error',
              summary: 'Teste expirou',
              detail: 'A validacao da conexao demorou demais. Verifique host, SSH e credenciais.',
            });
            return;
          }

          this.baseService.exibirErros(error);
        },
      });
  }

  private formatarResultadoTeste(res: any): string {
    if (res?.message) {
      return res.message;
    }

    const cloudMsg = res?.cloud?.message;
    const localMsg = res?.local?.message;

    if (cloudMsg && localMsg) {
      return `Cloud: ${cloudMsg} | Local: ${localMsg}`;
    }

    return cloudMsg || localMsg || 'Não foi possível testar a conexão.';
  }

  marcarPadrao(conexao: Conexao) {
    const id = this.obterIdConexao(conexao);

    if (!id || conexao.fl_padrao) {
      return;
    }

    this.baseService.update(`${this.endpoint}/${id}/padrao`, {}).subscribe({
      next: () => {
        this.carregarConexoes();
        this.messageService.add({
          severity: 'success',
          summary: 'Conexão padrão',
          detail: `"${conexao.nm_conexao}" será usada nas sincronizações.`,
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Não foi possível definir o padrão',
          detail: 'Tente novamente em instantes.',
        });
      },
    });
  }

  removerConexao(conexao: Conexao) {
    const id = this.obterIdConexao(conexao);

    if (!id) {
      return;
    }

    this.confirmationService.confirm({
      message: `Tem certeza de que deseja excluir a conexão "${conexao.nm_conexao}"?`,
      header: 'Confirmar exclusão',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Excluir',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.confirmarRemocao(id, conexao.nm_conexao),
    });
  }

  private confirmarRemocao(id: string, nome?: string) {
    this.baseService.deleteById(this.endpoint, id as any).subscribe({
      next: () => {
        this.carregarConexoes();
        this.messageService.add({
          severity: 'success',
          summary: 'Conexão removida',
          detail: nome ? `"${nome}" foi excluída.` : 'A conexão foi excluída.',
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Não foi possível excluir',
          detail: 'A conexão pode estar em uso. Tente novamente.',
        });
      },
    });
  }

  private oferecerSincronizacaoEstrutura() {
    this.confirmationService.confirm({
      message: 'Conexão salva. Deseja sincronizar a estrutura agora?',
      header: 'Próximo passo',
      icon: 'pi pi-sync',
      acceptLabel: 'Sincronizar estrutura',
      rejectLabel: 'Agora não',
      accept: () => this.router.navigate(['/client/estrutura']),
    });
  }

  fecharDialog() {
    this.dialogVisible = false;
    this.errorValidacao = {};
    this.abaDialogConexao = 'conexao';
  }

  alterarAbaDialog(value: string | number | undefined) {
    if (value === 'conexao' || value === 'ssh' || value === 'admin') {
      this.abaDialogConexao = value;
    }
  }

  private definirAbaInicialDialog(conexao: Conexao): 'conexao' | 'ssh' | 'admin' {
    if (conexao.fl_admin || conexao.arquivoValidado) {
      return 'admin';
    }

    if (conexao.db_cloud_ssh_enabled || conexao.db_local_ssh_enabled) {
      return 'ssh';
    }

    return 'conexao';
  }

  onCertificadoEnviado(res: any) {
    this.objeto.arquivoValidado = !!res;

    if (!res || typeof res === 'boolean' || typeof res === 'string') {
      return;
    }

    const dados = res?.data || res?.conexao || res;

    if (dados?.nm_conexao && !this.objeto.nm_conexao) {
      this.objeto.nm_conexao = dados.nm_conexao;
    }

    this.aplicarDadosConexao(this.objeto, dados);
    this.aplicarEstadoSenhas(this.objeto);

    this.cd.markForCheck();
  }

  validarItens(): boolean {
    try {
      const objetoValidacao = {
        ...this.objeto,
        db_cloud_password: this.obterSenhaCloudParaValidacao(),
      };

      ConexaoSchema.parse([objetoValidacao]);
      this.errorValidacao = {};
      return true;
    } catch (error) {
      if (error instanceof ZodError) {
        this.errorValidacao = {};
        error.issues.forEach((e) => {
          const value = e.path.slice(1).join('.');
          this.errorValidacao[String(value)] = e.message;
        });
        return false;
      }
      throw error;
    }
  }

  obterIdConexao(conexao: Conexao): string | undefined {
    return conexao.id || conexao.id_conexao;
  }

  get senhaCloudPlaceholder(): string {
    return this.senhaCloudDefinida
      ? 'Senha definida (digite apenas para alterar)'
      : 'Senha';
  }

  get senhaCloudSshPlaceholder(): string {
    return this.senhaCloudSshDefinida
      ? 'Senha SSH definida (digite apenas para alterar)'
      : 'Senha SSH';
  }

  get senhaLocalSshPlaceholder(): string {
    return this.senhaLocalSshDefinida
      ? 'Senha SSH definida (digite apenas para alterar)'
      : 'Senha SSH';
  }

  private montarPayload(conexao: Conexao) {
    const cloudPassword = conexao.db_cloud_password?.trim();
    const cloudSshPassword = conexao.db_cloud_ssh_password?.trim();
    const localSshPassword = conexao.db_local_ssh_password?.trim();

    return {
      id: this.obterIdConexao(conexao),
      nm_conexao: conexao.nm_conexao,
      fl_padrao: conexao.fl_padrao,
      fl_ativo: conexao.fl_ativo,

      cloud: {
        db_cloud_host: conexao.db_cloud_host,
        db_cloud_port: conexao.db_cloud_port,
        db_cloud_user: conexao.db_cloud_user,
        ...(cloudPassword ? { db_cloud_password: cloudPassword } : {}),
        fl_admin: conexao.fl_admin,
        db_cloud_ssh_enabled: conexao.db_cloud_ssh_enabled,
        db_cloud_ssh_host: conexao.db_cloud_ssh_host,
        db_cloud_ssh_port: conexao.db_cloud_ssh_port,
        db_cloud_ssh_user: conexao.db_cloud_ssh_user,
        ...(cloudSshPassword ? { db_cloud_ssh_password: cloudSshPassword } : {}),
      },

      local: {
        db_local_host: conexao.db_local_host,
        db_local_port: conexao.db_local_port,
        db_local_user: conexao.db_local_user,
        db_local_password: conexao.db_local_password,
        db_local_ssh_enabled: conexao.db_local_ssh_enabled,
        db_local_ssh_host: conexao.db_local_ssh_host,
        db_local_ssh_port: conexao.db_local_ssh_port,
        db_local_ssh_user: conexao.db_local_ssh_user,
        ...(localSshPassword ? { db_local_ssh_password: localSshPassword } : {}),
      },
    };
  }

  private normalizarConexoes(res: any): Conexao[] {
    const lista = Array.isArray(res) ? res : res?.conexoes || res?.items || res?.content;

    if (Array.isArray(lista)) {
      const conexoes = lista.map((item: any) => this.normalizarConexao(item));
      return this.aplicarPadraoVisual(conexoes);
    }

    if (res?.cloud || res?.local || res?.db_cloud_host || res?.db_local_host) {
      return this.aplicarPadraoVisual([this.normalizarConexao(res)]);
    }

    return [];
  }

  private normalizarConexao(res: any): Conexao {
    const conexao = new Conexao();
    Object.assign(conexao, res || {});
    conexao.id = res?.id || res?.id_conexao;
    conexao.id_conexao = res?.id_conexao || res?.id;
    conexao.nm_conexao = res?.nm_conexao || res?.nome || '';
    conexao.fl_padrao = !!res?.fl_padrao;
    conexao.fl_ativo = res?.fl_ativo ?? true;
    conexao.arquivoValidado = !!res?.arquivoValidado || !!res?.fl_admin || !!res?.cloud?.fl_admin;
    this.aplicarDadosConexao(conexao, res);
    return conexao;
  }

  private aplicarDadosConexao(conexao: Conexao, dados: any) {
    const cloud = dados?.cloud || {};
    const local = dados?.local || {};

    conexao.db_cloud_host = dados?.db_cloud_host ?? cloud.db_cloud_host ?? conexao.db_cloud_host;
    conexao.db_cloud_port = dados?.db_cloud_port ?? cloud.db_cloud_port ?? conexao.db_cloud_port;
    conexao.db_cloud_user = dados?.db_cloud_user ?? cloud.db_cloud_user ?? conexao.db_cloud_user;
    conexao.fl_admin = dados?.fl_admin ?? cloud.fl_admin ?? conexao.fl_admin;
    conexao.fl_cloud_password_defined =
      dados?.fl_cloud_password_defined ??
      cloud.fl_cloud_password_defined ??
      conexao.fl_cloud_password_defined;
    conexao.db_cloud_ssh_enabled =
      dados?.db_cloud_ssh_enabled ?? cloud.db_cloud_ssh_enabled ?? conexao.db_cloud_ssh_enabled;
    conexao.db_cloud_ssh_host =
      dados?.db_cloud_ssh_host ?? cloud.db_cloud_ssh_host ?? conexao.db_cloud_ssh_host;
    conexao.db_cloud_ssh_port =
      dados?.db_cloud_ssh_port ?? cloud.db_cloud_ssh_port ?? conexao.db_cloud_ssh_port ?? '22';
    conexao.db_cloud_ssh_user =
      dados?.db_cloud_ssh_user ?? cloud.db_cloud_ssh_user ?? conexao.db_cloud_ssh_user;
    conexao.fl_cloud_ssh_password_defined =
      dados?.fl_cloud_ssh_password_defined ??
      cloud.fl_cloud_ssh_password_defined ??
      conexao.fl_cloud_ssh_password_defined;
    conexao.db_local_host = dados?.db_local_host ?? local.db_local_host ?? conexao.db_local_host;
    conexao.db_local_port = dados?.db_local_port ?? local.db_local_port ?? conexao.db_local_port;
    conexao.db_local_user = dados?.db_local_user ?? local.db_local_user ?? conexao.db_local_user;
    conexao.db_local_password =
      dados?.db_local_password ?? local.db_local_password ?? conexao.db_local_password;
    conexao.db_local_ssh_enabled =
      dados?.db_local_ssh_enabled ?? local.db_local_ssh_enabled ?? conexao.db_local_ssh_enabled;
    conexao.db_local_ssh_host =
      dados?.db_local_ssh_host ?? local.db_local_ssh_host ?? conexao.db_local_ssh_host;
    conexao.db_local_ssh_port =
      dados?.db_local_ssh_port ?? local.db_local_ssh_port ?? conexao.db_local_ssh_port ?? '22';
    conexao.db_local_ssh_user =
      dados?.db_local_ssh_user ?? local.db_local_ssh_user ?? conexao.db_local_ssh_user;
    conexao.fl_local_ssh_password_defined =
      dados?.fl_local_ssh_password_defined ??
      local.fl_local_ssh_password_defined ??
      conexao.fl_local_ssh_password_defined;

    conexao.cloud = {
      db_cloud_host: conexao.db_cloud_host,
      db_cloud_port: conexao.db_cloud_port,
      db_cloud_user: conexao.db_cloud_user,
      fl_admin: conexao.fl_admin,
      fl_cloud_password_defined: conexao.fl_cloud_password_defined,
      db_cloud_ssh_enabled: conexao.db_cloud_ssh_enabled,
      db_cloud_ssh_host: conexao.db_cloud_ssh_host,
      db_cloud_ssh_port: conexao.db_cloud_ssh_port,
      db_cloud_ssh_user: conexao.db_cloud_ssh_user,
      fl_cloud_ssh_password_defined: conexao.fl_cloud_ssh_password_defined,
    };
    conexao.local = {
      db_local_host: conexao.db_local_host,
      db_local_port: conexao.db_local_port,
      db_local_user: conexao.db_local_user,
      db_local_password: conexao.db_local_password,
      db_local_ssh_enabled: conexao.db_local_ssh_enabled,
      db_local_ssh_host: conexao.db_local_ssh_host,
      db_local_ssh_port: conexao.db_local_ssh_port,
      db_local_ssh_user: conexao.db_local_ssh_user,
      fl_local_ssh_password_defined: conexao.fl_local_ssh_password_defined,
    };
  }

  private aplicarPadraoVisual(conexoes: Conexao[]): Conexao[] {
    if (conexoes.length === 1 && !conexoes[0].fl_padrao) {
      conexoes[0].fl_padrao = true;
    }
    return conexoes;
  }

  private aplicarEstadoSenhas(conexao: Conexao) {
    this.senhaCloudDefinida =
      !!conexao.fl_cloud_password_defined ||
      !!conexao.cloud?.fl_cloud_password_defined ||
      (conexao.arquivoValidado && !!conexao.fl_admin);

    this.senhaCloudSshDefinida =
      !!conexao.fl_cloud_ssh_password_defined ||
      !!conexao.cloud?.fl_cloud_ssh_password_defined;

    this.senhaLocalSshDefinida =
      !!conexao.fl_local_ssh_password_defined ||
      !!conexao.local?.fl_local_ssh_password_defined;

    this.limparSenhasProtegidas(conexao);
  }

  private limparSenhasProtegidas(conexao: Conexao) {
    conexao.db_cloud_password = '';
    conexao.db_cloud_ssh_password = '';
    conexao.db_local_ssh_password = '';

    if (conexao.cloud) {
      conexao.cloud.db_cloud_password = '';
      conexao.cloud.db_cloud_ssh_password = '';
    }

    if (conexao.local) {
      conexao.local.db_local_ssh_password = '';
    }
  }

  private limparEstadoSenhas() {
    this.senhaCloudDefinida = false;
    this.senhaCloudSshDefinida = false;
    this.senhaLocalSshDefinida = false;
    this.limparSenhasProtegidas(this.objeto);
  }

  private obterSenhaCloudParaValidacao(): string {
    const senhaDigitada = this.objeto.db_cloud_password?.trim();
    if (senhaDigitada) {
      return senhaDigitada;
    }

    if (this.senhaCloudDefinida) {
      return 'defined';
    }

    return '';
  }
}
