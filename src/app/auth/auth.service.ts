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
        const role = this.extrairRole(res);
        const idOrganizacao =
          res.idOrganizacao ??
          (!res.precisaSelecionarOrganizacao && res.organizacoes?.length === 1
            ? res.organizacoes[0]?.idOrganizacao
            : undefined);
        const userInfo = {
          tokenTemporario: res.precisaSelecionarOrganizacao ? res.accessToken : undefined,
          token: res.precisaSelecionarOrganizacao ? undefined : res.accessToken,
          accessToken: res.accessToken,
          tpGlobal: res.tpGlobal,
          precisaSelecionarOrganizacao: !!res.precisaSelecionarOrganizacao,
          trocarSenha: !!res.trocarSenha,
          organizacoes: res.organizacoes ?? [],
          idUsuario: res.idUsuario,
          idOrganizacao,
          dsRole: role,
          role,
          nmUsuario: res.nmUsuario,
          nmEmail: res.nmEmail,
          permissoes: res.permissoes ?? [],
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
    const tokenTemporario = this.getTokenTemporario();

    return this.http
      .post(
        `${this.apiUrl}/auth/selecionar-organizacao`,
        { idOrganizacao },
        { headers: criarAuthHeader(tokenTemporario) }
      )
      .pipe(
        tap((res: any) => {
          const sessaoAtual = this.getUserSubbject();
          const role = this.extrairRole({
            ...res,
            organizacoes: sessaoAtual?.organizacoes,
            idOrganizacao: res.idOrganizacao ?? idOrganizacao,
          });
          const userInfo = {
            ...sessaoAtual,
            tokenTemporario: undefined,
            token: res.accessToken,
            accessToken: res.accessToken,
            idOrganizacao: res.idOrganizacao ?? idOrganizacao,
            dsRole: role,
            role,
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

    const user = JSON.parse(userJson);
    if (!user?.token || user?.precisaSelecionarOrganizacao) return of();

    return this.http.get(`${this.apiUrl}/auth/me`).pipe(
      tap((res: any) => {
        const role = this.extrairRole(res);
        this.salvarSessao({
          ...this.getUserSubbject(),
          idUsuario: res.idUsuario,
          tpGlobal: res.tpGlobal,
          idOrganizacao: res.idOrganizacao,
          dsRole: role,
          role,
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

  getTokenTemporario(): string | undefined {
    const user = this.userSubject.value;
    return (
      user?.tokenTemporario ?? (user?.precisaSelecionarOrganizacao ? user?.accessToken : undefined)
    );
  }

  getRole(): string | undefined {
    return this.extrairRole(this.userSubject.value);
  }

  temOrganizacaoSelecionada(): boolean {
    const user = this.userSubject.value;
    return !!user?.token && user?.precisaSelecionarOrganizacao === false;
  }

  getRoleOrganizacaoAtiva(): string | undefined {
    const user = this.userSubject.value;
    if (!user || user.precisaSelecionarOrganizacao) return undefined;

    return this.extrairRole(user);
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

  private extrairRole(data: any): string | undefined {
    const role = data?.dsRole ?? data?.role ?? data?.nomeRole ?? data?.authority;
    if (typeof role === 'string' && role.trim()) return role;

    const roles = data?.roles ?? data?.authorities;
    const roleLista = this.extrairRoleDeLista(roles);
    if (roleLista) return roleLista;

    const roleOrganizacao = this.extrairRoleDeLista(data?.organizacoes);
    if (roleOrganizacao) return roleOrganizacao;

    return this.extrairRoleDoToken(data?.accessToken ?? data?.token);
  }

  private extrairRoleDeLista(lista: any): string | undefined {
    if (!Array.isArray(lista)) return undefined;

    const primeiraRole = lista.find((item) => {
      if (typeof item === 'string') return item.trim();
      return item?.dsRole || item?.role || item?.nomeRole || item?.name || item?.authority;
    });

    if (typeof primeiraRole === 'string') return primeiraRole;

    return (
      primeiraRole?.dsRole ??
      primeiraRole?.role ??
      primeiraRole?.nomeRole ??
      primeiraRole?.name ??
      primeiraRole?.authority
    );
  }

  private extrairRoleDoToken(token?: string): string | undefined {
    if (!token) return undefined;

    try {
      const payload = token.split('.')[1];
      if (!payload) return undefined;

      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(atob(base64));
      return decoded?.dsRole ?? decoded?.role ?? decoded?.authority;
    } catch {
      return undefined;
    }
  }

  private removerMascaraCpf(cpf: string): string {
    return cpf?.replace(/\D/g, '') ?? '';
  }
}
