import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { MessageService } from 'primeng/api';
import { FlagOption } from '../models/flag-option';
import { extractApiErrorMessage } from '../utils/api-error-message';

@Injectable({
  providedIn: 'root',
})
export class BaseService {
  private readonly apiUrl = `${environment.apiUrl}`;
  private messageService = inject(MessageService);

  constructor(private http: HttpClient) { }

  obterObjetoOpcoes(
    endpoint: string,
    nameParam: string,
    codeParam: string
  ): Observable<FlagOption[]> {
    const url = `${this.apiUrl}/${endpoint}`;

    return this.http.get<any[]>(url).pipe(
      map((res) => {
        return res.map((index: any) => {
          const item = new FlagOption();
          item.code = codeParam.length === 0 ? index : String(index[codeParam]);
          item.name = nameParam.length === 0 ? index : index[nameParam];
          return item;
        });
      }),
      catchError((e) => {
        console.error(e);
        this.exibirErros(e);
        return throwError(() => e);
      })
    );
  }

  findSequence(endpoint: string): Observable<any> {
    const url = `${this.apiUrl}/${endpoint}/sequencia`;

    return this.http.get<any>(url).pipe(
      tap((res) => {
        return res;
      }),
      catchError((e) => {
        console.log(e);
        this.exibirErros(e);
        return throwError(() => e);
      })
    );
  }

  findSequenceDetalhe(endpoint: string, id: number): Observable<any> {
    const url = `${this.apiUrl}/${endpoint}/sequencia-detalhe/${id}`;

    return this.http.get<any>(url).pipe(
      tap((res) => {
        return res;
      }),
      catchError((e) => {
        console.log(e);
        this.exibirErros(e);
        return throwError(() => e);
      })
    );
  }

  findAll(endpoint: string, token?: string): Observable<any> {
    const url = `${this.apiUrl}/${endpoint}`;

    const headers = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    return this.http.get<any>(url, { headers }).pipe(
      tap((res) => {
        return res;
      }),
      catchError((e) => {
        console.log(e);
        this.exibirErros(e);
        return throwError(() => e);
      })
    );
  }

  listarPaginado(endpoint: string, page: number, size: number, filters?: any) {
    const url = `${this.apiUrl}/${endpoint}`;

    const params: any = { page, size };

    if (filters?.global) {
      params.search = filters.global;
    }

    return this.http.get<any>(url, {
      params,
    });
  }

  findById(endpoint: string, id: any): Observable<any> {
    const url = `${this.apiUrl}/${endpoint}/${id}`;

    return this.http.get<any>(url).pipe(
      tap((res) => {
        return res;
      }),
      catchError((e) => {
        console.log(e);
        this.exibirErros(e);
        return throwError(() => e);
      })
    );
  }

  createMestreDetalhe(endpoint: string, data: any): Observable<any> {
    const url = `${this.apiUrl}/${endpoint}/cadastrar`;

    return this.http.post<any>(url, data).pipe(
      tap((res) => {
        this.exibirSucesso(res);
        return res;
      }),
      catchError((e) => {
        console.log(e);
        this.exibirErros(e);
        return throwError(() => e);
      })
    );
  }

  create(endpoint: string, data: any): Observable<any> {
    const url = `${this.apiUrl}/${endpoint}`;

    return this.http.post<any>(url, data).pipe(
      tap((res) => {
        this.exibirSucesso(res);
        return res;
      }),
      catchError((e) => {
        console.log(e);
        this.exibirErros(e);
        return throwError(() => e);
      })
    );
  }

  update(endpoint: string, data: any): Observable<any> {
    const url = `${this.apiUrl}/${endpoint}`;

    return this.http.put<any>(url, data).pipe(
      tap((res) => {
        this.exibirSucesso(res);
        return res;
      }),
      catchError((e) => {
        console.log(e);
        this.exibirErros(e);
        return throwError(() => e);
      })
    );
  }

  uploadFile(endpoint: string, data: any): Observable<any> {
    const url = `${this.apiUrl}/${endpoint}`;

    return this.http.post(url, data, { responseType: 'text' as 'text' }).pipe(
      tap((res: string) => {
        console.log(res);
        this.exibirSucesso(typeof res === 'string' ? { message: res } : res);
      }),
      map((res: string) => {
        try {
          return JSON.parse(res);
        } catch {
          return res;
        }
      }),
      catchError((e) => {
        console.error(e);
        this.exibirErros(e);
        return throwError(() => e);
      })
    );
  }

  deleteById(endpoint: string, id: number): Observable<any> {
    const url = `${this.apiUrl}/${endpoint}/${id}`;

    return this.http.delete<any>(url).pipe(
      tap((res) => {
        this.exibirSucesso(res);
        return res;
      }),
      catchError((e) => {
        console.log(e);
        this.exibirErros(e);
        return throwError(() => e);
      })
    );
  }

  verificarStatus(endpoint: string): Observable<any> {
    const url = `${this.apiUrl}/${endpoint}`;


    return this.http.get<any>(url).pipe(
      tap((res) => {
        return res;
      }),
      catchError((e) => {
        console.log(e);
        return throwError(() => e);
      })
    );
  }

  exibirErros(e: any) {
    let summary = 'Erro';
    let detail = extractApiErrorMessage(e, 'Ocorreu um erro inesperado');

    if (e?.status === 400) {
      summary = 'Dados invalidos';
    } else if (e?.status === 404) {
      summary = 'Registro nao encontrado';
    } else if (e?.status === 409) {
      summary = 'Conflito';
    } else if (e?.error?.sucesso === false) {
      summary = 'Erro de validação';
    } else if (e?.status >= 500) {
      summary = 'Erro no servidor';
    }

    this.messageService.add({
      severity: 'error',
      summary,
      detail,
    });
  }
  exibirSucesso(res: any) {
    this.messageService.add({
      severity: 'success',
      summary: 'Sucesso',
      detail: res.message,
    });
  }
}
