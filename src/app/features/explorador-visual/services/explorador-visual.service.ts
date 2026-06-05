import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  DiagramResponse,
  AmbienteExplorador,
  BaseTreeNode,
  ConexaoExplorador,
  DadosTabelaPreview,
  SchemaResumo,
  SelectOption,
  TabelaDetalhe,
  TabelaResumo,
} from '../models/explorador-visual.model';

@Injectable({ providedIn: 'root' })
export class ExploradorVisualService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listarAmbientes(idConexao?: string): Observable<SelectOption[]> {
    return this.http
      .get<Array<string | { label?: string; value?: string; nome?: string; ambiente?: string }>>(
        `${this.apiUrl}/explorador/ambientes`,
        { params: this.criarParams(idConexao) }
      )
      .pipe(
        map((res) =>
          (Array.isArray(res) ? res : []).map((ambiente) => {
            const value =
              typeof ambiente === 'string'
                ? ambiente
                : ambiente.value || ambiente.ambiente || ambiente.nome || '';
            return {
              label: typeof ambiente === 'string' ? this.formatarAmbiente(value) : ambiente.label || this.formatarAmbiente(value),
              value,
            };
          })
        )
      );
  }

  listarConexoes(): Observable<SelectOption[]> {
    return this.http.get<ConexaoExplorador[]>(`${this.apiUrl}/conexao`).pipe(
      map((res) =>
        (Array.isArray(res) ? res : []).map((conexao) => {
          const id = conexao.id || conexao.id_conexao || '';
          return {
            label: `${conexao.nm_conexao || conexao.nome || 'Conexao'}${conexao.fl_padrao ? ' (padrao)' : ''}`,
            value: id,
          };
        })
      )
    );
  }

  listarBasesAmbiente(ambiente: AmbienteExplorador, idConexao?: string): Observable<BaseTreeNode[]> {
    return this.http
      .get<unknown[]>(`${this.apiUrl}/explorador/${ambiente}/bases`, {
        params: this.criarParams(idConexao),
      })
      .pipe(
        map((res) =>
          (Array.isArray(res) ? res : []).map((base) => ({
            nome: this.extrairNome(base, ['nome', 'name', 'base', 'database', 'datname', 'nm_base']),
            expanded: false,
            loading: false,
            schemasLoaded: false,
            schemas: [],
          }))
        )
      );
  }

  listarSchemasAmbiente(
    ambiente: AmbienteExplorador,
    base: string,
    idConexao?: string
  ): Observable<SelectOption[]> {
    return this.http
      .get<unknown[]>(`${this.apiUrl}/explorador/${ambiente}/${encodeURIComponent(base)}/schemas`, {
        params: this.criarParams(idConexao),
      })
      .pipe(
        map((res) =>
          (Array.isArray(res) ? res : []).map((schema) => ({
            label: this.extrairNome(schema, ['schema', 'nome', 'name', 'nspname', 'nm_schema']),
            value: this.extrairNome(schema, ['schema', 'nome', 'name', 'nspname', 'nm_schema']),
          }))
        )
      );
  }

  listarTabelasAmbiente(
    ambiente: AmbienteExplorador,
    base: string,
    schema: string,
    idConexao?: string
  ): Observable<TabelaResumo[]> {
    return this.http
      .get<Array<TabelaResumo | string>>(
        `${this.apiUrl}/explorador/${ambiente}/${encodeURIComponent(base)}/${encodeURIComponent(schema)}/tabelas`,
        { params: this.criarParams(idConexao) }
      )
      .pipe(
        map((res) =>
          (Array.isArray(res) ? res : []).map((tabela) =>
            typeof tabela === 'string'
              ? { id: `${schema}.${tabela}`, schema, nome: tabela }
              : this.normalizarTabela(tabela, schema)
          )
        )
      );
  }

  detalharTabelaAmbiente(
    ambiente: AmbienteExplorador,
    base: string,
    schema: string,
    tabela: string,
    idConexao?: string
  ): Observable<TabelaDetalhe> {
    return this.http.get<TabelaDetalhe>(
      `${this.apiUrl}/explorador/${ambiente}/${encodeURIComponent(base)}/${encodeURIComponent(schema)}/tabelas/${encodeURIComponent(tabela)}`,
      { params: this.criarParams(idConexao) }
    );
  }

  listarDadosTabela(
    ambiente: AmbienteExplorador,
    base: string,
    schema: string,
    tabela: string,
    page = 0,
    size = 100,
    idConexao?: string
  ): Observable<DadosTabelaPreview> {
    const params = this.criarParams(idConexao).set('page', String(page)).set('size', String(size));
    return this.http.get<DadosTabelaPreview>(
      `${this.apiUrl}/explorador/${ambiente}/${encodeURIComponent(base)}/${encodeURIComponent(schema)}/tabelas/${encodeURIComponent(tabela)}/dados`,
      { params }
    );
  }

  compararSchema(base: string, schema: string, idConexao?: string): Observable<DiagramResponse> {
    return this.http.get<DiagramResponse>(
      `${this.apiUrl}/explorador/comparacao/${encodeURIComponent(base)}/${encodeURIComponent(schema)}`,
      { params: this.criarParams(idConexao) }
    );
  }

  detalharTabela(
    base: string,
    schema: string,
    tabela: string,
    idConexao?: string
  ): Observable<TabelaDetalhe> {
    return this.http.get<TabelaDetalhe>(
      `${this.apiUrl}/explorador/comparacao/${encodeURIComponent(base)}/${encodeURIComponent(schema)}/${encodeURIComponent(tabela)}`,
      { params: this.criarParams(idConexao) }
    );
  }

  grafoSchemaAmbiente(
    ambiente: AmbienteExplorador,
    base: string,
    schema: string,
    idConexao?: string
  ): Observable<DiagramResponse> {
    return this.http.get<DiagramResponse>(
      `${this.apiUrl}/explorador/${ambiente}/${encodeURIComponent(base)}/${encodeURIComponent(schema)}/grafo`,
      { params: this.criarParams(idConexao) }
    );
  }

  private criarParams(idConexao?: string): HttpParams {
    return idConexao ? new HttpParams().set('idConexao', idConexao) : new HttpParams();
  }

  private formatarAmbiente(ambiente: string): string {
    return ambiente === 'cloud' ? 'Cloud' : ambiente === 'local' ? 'Local' : ambiente;
  }

  private extrairNome(valor: unknown, campos: string[]): string {
    if (valor === null || valor === undefined) {
      return '';
    }

    if (typeof valor !== 'object') {
      return String(valor);
    }

    const objeto = valor as Record<string, unknown>;
    const campo = campos.find((key) => objeto[key] !== null && objeto[key] !== undefined);
    return campo ? String(objeto[campo]) : JSON.stringify(objeto);
  }

  private normalizarTabela(tabela: TabelaResumo | any, schema: string): TabelaResumo {
    const nome = this.extrairNome(tabela, ['nome', 'name', 'tabela', 'tableName', 'relname']);
    return {
      ...tabela,
      id: tabela.id || tabela.nomeCompleto || tabela.nome_completo || `${schema}.${nome}`,
      schema: tabela.schema || schema,
      nome,
    };
  }
}
