import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  DiagramResponse,
  AmbienteExplorador,
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

  listarBases(): Observable<SelectOption[]> {
    return this.http.get<unknown[]>(`${this.apiUrl}/sincronizacao/bases/`).pipe(
      map((res) =>
        (Array.isArray(res) ? res : []).map((base) => ({
          label: String(base),
          value: String(base),
        }))
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

  listarBasesAmbiente(
    ambiente: AmbienteExplorador,
    idConexao?: string
  ): Observable<SelectOption[]> {
    return this.http
      .get<unknown[]>(`${this.apiUrl}/explorador/${ambiente}/bases`, {
        params: this.criarParams(idConexao),
      })
      .pipe(
        map((res) =>
          (Array.isArray(res) ? res : []).map((base) => ({
            label: String(base),
            value: String(base),
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
            label: String(schema),
            value: String(schema),
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
              : tabela
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
    limit = 100,
    idConexao?: string
  ): Observable<DadosTabelaPreview> {
    const params = this.criarParams(idConexao).set('limit', String(limit));
    return this.http.get<DadosTabelaPreview>(
      `${this.apiUrl}/explorador/${ambiente}/${encodeURIComponent(base)}/${encodeURIComponent(schema)}/tabelas/${encodeURIComponent(tabela)}/dados`,
      { params }
    );
  }

  compararSchemas(base: string, idConexao?: string): Observable<SchemaResumo[]> {
    return this.http
      .get<Array<SchemaResumo | any> | { schemas?: Array<SchemaResumo | any> }>(
        `${this.apiUrl}/explorador/${encodeURIComponent(base)}/schemas/comparar`,
        { params: this.criarParams(idConexao) }
      )
      .pipe(
        map((res) => (Array.isArray(res) ? res : res.schemas || [])),
        map((res) =>
          res.map((schema) => ({
            ...schema,
            schema: schema.schema || schema.nome,
          }))
        )
      );
  }

  compararSchema(base: string, schema: string, idConexao?: string): Observable<DiagramResponse> {
    return this.http.get<DiagramResponse>(
      `${this.apiUrl}/explorador/${encodeURIComponent(base)}/${encodeURIComponent(schema)}/comparar`,
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
      `${this.apiUrl}/explorador/${encodeURIComponent(base)}/${encodeURIComponent(schema)}/tabelas/${encodeURIComponent(tabela)}/detalhe`,
      { params: this.criarParams(idConexao) }
    );
  }

  grafoTabela(
    base: string,
    schema: string,
    tabela: string,
    idConexao?: string
  ): Observable<DiagramResponse> {
    return this.http.get<DiagramResponse>(
      `${this.apiUrl}/explorador/${encodeURIComponent(base)}/${encodeURIComponent(schema)}/tabelas/${encodeURIComponent(tabela)}/grafo`,
      { params: this.criarParams(idConexao) }
    );
  }

  private criarParams(idConexao?: string): HttpParams {
    return idConexao ? new HttpParams().set('idConexao', idConexao) : new HttpParams();
  }
}
