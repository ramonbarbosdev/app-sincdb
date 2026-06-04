import { ChangeDetectorRef, Component, inject } from '@angular/core';
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
import { LayoutCampo } from '../../../../components/layout-campo/layout-campo';
import { BaseService } from '../../../../services/base.service';
import { ConexaoSchema } from '../../../../schema/conexao-schema';
import { Conexao } from '../../../../models/conexao';
import { UploadCertiicado } from '../upload-certiicado/upload-certiicado';

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
    UploadCertiicado,
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
  public carregandoConexao = false;

  private baseService = inject(BaseService);
  private cd = inject(ChangeDetectorRef);
  private endpoint = 'conexao';

  ngOnInit(): void {
    this.carregarConexoes();
  }

  carregarConexoes() {
    this.loading = true;
    this.baseService.findAll(this.endpoint).subscribe({
      next: (res: any) => {
        this.listaConexoes = this.normalizarConexoes(res);
        console.log(this.listaConexoes)
        this.loading = false;
        this.cd.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cd.markForCheck();
      },
    });
  }

  novaConexao() {
    this.objeto = new Conexao();
    this.objeto.fl_padrao = this.listaConexoes.length === 0;
    this.errorValidacao = {};
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
        this.errorValidacao = {};
        this.dialogVisible = true;
        this.carregandoConexao = false;
        this.cd.markForCheck();
      },
      error: () => {
        this.carregandoConexao = false;
        this.cd.markForCheck();
      }
    });
  }

  salvarConexao() {
    console.log(this.validarItens())
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
      },
      error: () => {
        this.salvando = false;
        this.cd.markForCheck();
      },
    });
  }

  marcarPadrao(conexao: Conexao) {
    const id = this.obterIdConexao(conexao);

    if (!id || conexao.fl_padrao) {
      return;
    }

    this.baseService.update(`${this.endpoint}/${id}/padrao`, {}).subscribe({
      next: () => this.carregarConexoes(),
    });
  }

  removerConexao(conexao: Conexao) {
    const id = this.obterIdConexao(conexao);

    if (!id) {
      return;
    }

    this.baseService.deleteById(this.endpoint, id as any).subscribe({
      next: () => this.carregarConexoes(),
    });
  }

  fecharDialog() {
    this.dialogVisible = false;
    this.errorValidacao = {};
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

    this.cd.markForCheck();
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

  private montarPayload(conexao: Conexao) {
    return {
      id: this.obterIdConexao(conexao),
      nm_conexao: conexao.nm_conexao,
      fl_padrao: conexao.fl_padrao,
      fl_ativo: conexao.fl_ativo,
    };
  }

  private normalizarConexoes(res: any): Conexao[] {
    const lista = Array.isArray(res) ? res : res?.conexoes || res?.items || res?.content;

    if (Array.isArray(lista)) {
      const conexoes = lista.map((item: any) => this.normalizarConexao(item));
      return this.aplicarPadraoVisual(conexoes);
    }

    if (res?.cloud || res?.local) {
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
    conexao.arquivoValidado = !!res?.arquivoValidado || !!res?.cloud?.fl_admin;

    return conexao;
  }

  private aplicarPadraoVisual(conexoes: Conexao[]): Conexao[] {
    if (conexoes.length === 1 && !conexoes[0].fl_padrao) {
      conexoes[0].fl_padrao = true;
    }
    return conexoes;
  }
}
