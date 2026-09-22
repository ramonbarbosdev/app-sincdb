import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type ForumFiltro = 'todos' | 'bug' | 'sugestao';
export type ForumOrdenacao = 'destaque' | 'recente';
export type ForumComposeTipo = 'bug' | 'sugestao';
export type ForumEstadoGeral = 'OPERACIONAL' | 'DEGRADADO' | 'MANUTENCAO';

export interface ForumPost {
  id: string;
  tipo: 'BUG' | 'SUGESTAO';
  titulo: string;
  descricao: string;
  idUsuario?: string;
  nomeUsuario?: string;
  statusPost?: string;
  curtidasCount: number;
  curtidoPorMim: boolean;
  emDestaque: boolean;
  destaqueManual?: boolean;
  destaqueExcluido?: boolean;
  podeEditar: boolean;
  podeExcluir: boolean;
  createdAt?: string;
}

export interface ForumSystemStatus {
  estadoGeral: ForumEstadoGeral;
  titulo: string;
  mensagem: string;
  proximaVersao?: string;
  previsaoRelease?: string;
  atualizadoEm?: string;
  atualizadoPor?: string;
}

export interface ForumMetricas {
  status: ForumSystemStatus;
  bugsAbertos: number;
  sugestoesAbertas: number;
  postsDestaque: ForumPost[];
}

@Injectable({ providedIn: 'root' })
export class ForumService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/forum`;

  getMetricas(): Observable<ForumMetricas> {
    return this.http.get<ForumMetricas>(`${this.base}/metricas`);
  }

  getStatus(): Observable<ForumSystemStatus> {
    return this.http.get<ForumSystemStatus>(`${this.base}/status`);
  }

  updateStatus(body: Partial<ForumSystemStatus>): Observable<ForumSystemStatus> {
    return this.http.put<ForumSystemStatus>(`${this.base}/status`, body);
  }

  getPosts(filtro: ForumFiltro, ordenacao: ForumOrdenacao): Observable<ForumPost[]> {
    return this.http.get<ForumPost[]>(`${this.base}/posts`, {
      params: { filtro, ordenacao },
    });
  }

  createPost(body: { tipo: 'BUG' | 'SUGESTAO'; titulo: string; descricao: string }): Observable<ForumPost> {
    return this.http.post<ForumPost>(`${this.base}/posts`, body);
  }

  updatePost(
    id: string,
    body: { tipo?: 'BUG' | 'SUGESTAO'; titulo?: string; descricao?: string }
  ): Observable<ForumPost> {
    return this.http.put<ForumPost>(`${this.base}/posts/${id}`, body);
  }

  deletePost(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/posts/${id}`);
  }

  toggleCurtida(id: string): Observable<{ curtidasCount: number; curtidoPorMim: boolean }> {
    return this.http.post<{ curtidasCount: number; curtidoPorMim: boolean }>(
      `${this.base}/posts/${id}/curtir`,
      {}
    );
  }

  patchPostStatus(id: string, statusPost: 'RESOLVIDO' | 'IMPLEMENTADO' | 'ABERTO'): Observable<ForumPost> {
    return this.http.patch<ForumPost>(`${this.base}/posts/${id}/status`, { statusPost });
  }

  patchDestaque(id: string, destacar: boolean): Observable<ForumPost> {
    return this.http.patch<ForumPost>(`${this.base}/posts/${id}/destaque`, { destacar });
  }
}
