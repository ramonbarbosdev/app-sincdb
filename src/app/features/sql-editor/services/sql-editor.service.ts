import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, delay, map, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ConexaoSqlOption,
  SaveSqlQueryRequest,
  SavedSqlQuery,
  SelectOption,
  SqlExecutionRequest,
  SqlExecutionResponse,
  SqlHistoryItem,
} from '../models/sql-editor.model';

@Injectable({ providedIn: 'root' })
export class SqlEditorService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  executar(payload: SqlExecutionRequest): Observable<SqlExecutionResponse> {
    return this.http.post<SqlExecutionResponse>(`${this.apiUrl}/sql/executar`, payload, {
      withCredentials: true,
    });
  }

  listarConexoes(): Observable<SelectOption[]> {
    return this.http.get<ConexaoSqlOption[]>(`${this.apiUrl}/conexao`, { withCredentials: true }).pipe(
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

  listarBases(ambiente: string, conexaoId: string): Observable<SelectOption[]> {
    const params = conexaoId ? new HttpParams().set('idConexao', conexaoId) : new HttpParams();
    return this.http
      .get<unknown[]>(`${this.apiUrl}/explorador/${ambiente}/bases`, {
        params,
        withCredentials: true,
      })
      .pipe(
        map((res) =>
          (Array.isArray(res) ? res : []).map((base) => {
            const nome = this.extrairNome(base, ['nome', 'name', 'base', 'database', 'datname', 'nm_base']);
            return {
              label: nome,
              value: nome,
            };
          })
        )
      );
  }

  listarHistorico(): Observable<SqlHistoryItem[]> {
    const history: SqlHistoryItem[] = [
      {
        id: 'hist-1',
        sql: 'SELECT * FROM public.usuario LIMIT 100;',
        ambiente: 'cloud',
        base: 'w5i_homologacao',
        executedAt: '2026-06-12T10:20:00',
        executionTimeMs: 112,
      },
      {
        id: 'hist-2',
        sql: 'SELECT COUNT(*) FROM public.empresa LIMIT 100;',
        ambiente: 'local',
        base: 'sincdb_local',
        executedAt: '2026-06-11T15:42:00',
        executionTimeMs: 88,
      },
    ];

    return of(history).pipe(delay(250));
  }

  salvarConsulta(payload: SaveSqlQueryRequest): Observable<void> {
    void payload;
    return of(void 0).pipe(delay(350));
  }

  listarConsultasSalvas(): Observable<SavedSqlQuery[]> {
    return of([]).pipe(delay(250));
  }

  private extrairNome(valor: unknown, campos: string[]): string {
    if (valor === null || valor === undefined) return '';
    if (typeof valor !== 'object') return String(valor);

    const objeto = valor as Record<string, unknown>;
    const campo = campos.find((key) => objeto[key] !== null && objeto[key] !== undefined);
    return campo ? String(objeto[campo]) : JSON.stringify(objeto);
  }
}
