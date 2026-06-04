import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, Observable, of, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoadingService } from '../services/loading.service';
import { MessageService } from 'primeng/api';
import { criarAuthHeader } from './auth-header';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}`;

  private router = inject(Router);
  private messageService = inject(MessageService);

  private userSubject = new BehaviorSubject<any | null>(null);
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private loadingService: LoadingService) {
    const userJson = sessionStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      this.userSubject.next(user);
    }
  }

  login(credenciais: { nuCpf: string; dsSenha: string }): Observable<any> {
    const payload = {
      nuCpf: this.removerMascaraCpf(credenciais.nuCpf),
      dsSenha: credenciais.dsSenha,
    };

    return this.http.post(`${this.apiUrl}/auth/login`, payload).pipe(
      tap((res: any) => {
        const userInfo = {
          tokenTemporario: res.accessToken,
          token: res.precisaSelecionarOrganizacao ? undefined : res.accessToken,
          accessToken: res.accessToken,
          tpGlobal: res.tpGlobal,
          precisaSelecionarOrganizacao: !!res.precisaSelecionarOrganizacao,
          trocarSenha: !!res.trocarSenha,
          organizacoes: res.organizacoes ?? [],
        };

        this.salvarSessao(userInfo);
      }),
      catchError((e) => {
        console.log(e);
        this.exibirErros(e);
        return throwError(() => e);
      })
    );
  }

  selecionarOrganizacao(idOrganizacao: string): Observable<any> {
    const tokenTemporario = this.getUserSubbject()?.tokenTemporario;

    return this.http
      .post(
        `${this.apiUrl}/auth/selecionar-organizacao`,
        { idOrganizacao },
        { headers: criarAuthHeader(tokenTemporario) }
      )
      .pipe(
        tap((res: any) => {
          const userInfo = {
            ...this.getUserSubbject(),
            tokenTemporario: undefined,
            token: res.accessToken,
            accessToken: res.accessToken,
            idOrganizacao: res.idOrganizacao,
            dsRole: res.dsRole,
            role: res.dsRole,
            permissoes: res.permissoes ?? [],
            precisaSelecionarOrganizacao: false,
          };

          this.salvarSessao(userInfo);
        }),
        catchError((e) => {
          console.log(e);
          this.exibirErros(e);
          return throwError(() => e);
        })
      );
  }

  checkAuth(): Observable<any> {
    const userJson = sessionStorage.getItem('user');
    if (!userJson) return of();

    return this.http.get(`${this.apiUrl}/auth/me`).pipe(
      tap((res: any) => {
        this.salvarSessao({
          ...this.getUserSubbject(),
          idUsuario: res.idUsuario,
          tpGlobal: res.tpGlobal,
          idOrganizacao: res.idOrganizacao,
          dsRole: res.dsRole,
          role: res.dsRole,
          nmUsuario: res.nmUsuario,
          nmEmail: res.nmEmail,
          permissoes: res.permissoes ?? [],
        });
      }),
      catchError((error) => {
        this.limparSessao();
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    this.limparSessao();
    this.router.navigate(['/auth/login']);
  }

  cadastrar(data: any): Observable<any> {
    const url = `${this.apiUrl}/auth/register`;

    return this.http.post(url, data).pipe(catchError((error) => throwError(() => error)));
  }

  getAccessToken(): string | undefined {
    const user = this.userSubject.value;
    return user?.token;
  }

  getUser() {
    return this.userSubject.value;
  }

  getUserSubbject() {
    return this.userSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  updateUserAvatar(url: string) {
    const user = this.userSubject.value;
    if (user) {
      const updatedUser = { ...user, img: url };
      this.salvarSessao(updatedUser);
    }
  }

  updateUserNome(nome: string) {
    const user = this.userSubject.value;
    if (user) {
      const updatedUser = { ...user, nome, nmUsuario: nome };
      this.salvarSessao(updatedUser);
    }
  }

  exibirErros(e: any) {
    this.messageService.add({
      severity: 'error',
      summary: e?.error?.message || 'Erro',
      detail: e?.error?.codeDescription || e?.error?.error || 'Nao foi possivel autenticar',
    });
  }

  exibirSucesso(res: any) {
    this.messageService.add({
      severity: 'success',
      summary: 'Sucesso',
      detail: res.message,
    });
  }

  private salvarSessao(user: any) {
    this.userSubject.next(user);
    sessionStorage.setItem('user', JSON.stringify(user));
  }

  private limparSessao() {
    this.userSubject.next(null);
    sessionStorage.removeItem('user');
  }

  private removerMascaraCpf(cpf: string): string {
    return cpf?.replace(/\D/g, '') ?? '';
  }
}
