import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { MessageService } from 'primeng/api';
import { catchError, map, Observable, of } from 'rxjs';
import { Parametromaster } from '../models/parametromaster';

@Injectable({
  providedIn: 'root',
})
export class ParametroService {
  
  private readonly apiUrl = `${environment.apiUrl}/parametromaster`;
  private messageService = inject(MessageService);

  constructor(private http: HttpClient) {}

  /**
   * Busca todos os parâmetros do backend.
   */
  public carregarParametros(): Observable<Parametromaster[]> {
    return this.http.get<Parametromaster[]>(`${this.apiUrl}/`).pipe(
      catchError((err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Falha ao carregar parâmetros',
        });
        return of([]);
      })
    );
  }

  /**
   * Busca um parâmetro específico pelo código
   */
  public getParametro(codigo: string): Observable<Parametromaster | undefined> {
    return this.carregarParametros().pipe(
      map((params) => params.find((p) => p.codigo === codigo))
    );
  }

  /**
   * Converte o valor do parâmetro para o tipo correto
   */
  public parseValor(param: Parametromaster): any {
    if (!param || param.valor == null) return null;

    switch (param.tipo) {
      case 'bool':
        return param.valor === 'true';
      case 'number':
        return Number(param.valor);
      case 'date':
        return param.valor; // ou new Date(param.vl_parametromaster)
      case 'text':
      default:
        return param.valor;
    }
  }
}
