import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, Observable, of, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoadingService } from '../services/loading.service';
import { MessageService } from 'primeng/api';
import { criarAuthHeader } from './auth-header';
import {
  AUTH_USER_STORAGE_KEY,
  authStorage,
  isDesktopApp,
  migrateAuthUserToPersistentStorage,
} from '../utils/platform-storage';

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
    migrateAuthUserToPersistentStorage();
    const userJson = authStorage().getItem(AUTH_USER_STORAGE_KEY);
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
          nuCpf: this.removerMascaraCpf(credenciais.nuCpf),
          login: this.removerMascaraCpf(credenciais.nuCpf),
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
    const userJson = authStorage().getItem(AUTH_USER_STORAGE_KEY);
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
          login: res.nmEmail ? this.removerMascaraCpf(res.nmEmail) : this.getUserSubbject()?.login,
        });
      }),
      catchError((error) => {
        const status = error?.status;
        if (status === 401 || status === 403) {
          this.limparSessao();
        }
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    this.limparSessao();
    this.router.navigate(['/auth/login']);
  }

  /** Limpa sessão sem navegar (ex.: voltar no fluxo de login). */
  clearSession(): void {
    this.limparSessao();
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

  isDevRole(): boolean {
    return this.getRoleOrganizacaoAtiva() === 'ROLE_DEV';
  }

  /** Rota inicial após login ou ao acessar /client sem path. */
  getDefaultAppRoute(): string[] {
    if (this.getRoleOrganizacaoAtiva() === 'ROLE_DEV') {
      return ['/client/forum'];
    }
    return ['/client/sincronizacao-diagrama'];
  }

  getUser() {
    return this.userSubject.value;
  }

  getUserSubbject() {
    return this.userSubject.value;
  }

  /** CPF/login (11 dígitos) para chamadas que usam login do usuário. */
  getUsuarioLogin(): string | undefined {
    const user = this.userSubject.value;
    if (!user) return undefined;

    for (const candidato of [user.login, user.nuCpf, user.nmEmail]) {
      if (typeof candidato !== 'string' || !candidato.trim()) continue;
      const digits = this.removerMascaraCpf(candidato);
      if (digits.length === 11) return digits;
    }

    const sub = this.extrairSubjectDoToken(user.token ?? user.accessToken);
    if (sub) {
      const digits = this.removerMascaraCpf(sub);
      if (digits.length === 11) return digits;
      return sub.replace(/\D/g, '') || sub;
    }

    return undefined;
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
    const serialized = JSON.stringify(user);
    authStorage().setItem(AUTH_USER_STORAGE_KEY, serialized);
    if (isDesktopApp()) {
      localStorage.setItem(AUTH_USER_STORAGE_KEY, serialized);
    }
  }

  private limparSessao() {
    this.userSubject.next(null);
    authStorage().removeItem(AUTH_USER_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_USER_STORAGE_KEY);
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
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
      const decoded = this.decodificarPayloadJwt(token);
      return this.extrairClaimString(decoded, 'dsRole', 'role', 'authority');
    } catch {
      return undefined;
    }
  }

  private extrairSubjectDoToken(token?: string): string | undefined {
    if (!token) return undefined;
    try {
      const decoded = this.decodificarPayloadJwt(token);
      return this.extrairClaimString(decoded, 'sub');
    } catch {
      return undefined;
    }
  }

  private extrairClaimString(
    payload: Record<string, unknown> | undefined,
    ...keys: string[]
  ): string | undefined {
    if (!payload) return undefined;
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return undefined;
  }

  private decodificarPayloadJwt(token: string): Record<string, unknown> | undefined {
    const payload = token.split('.')[1];
    if (!payload) return undefined;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  }

  private removerMascaraCpf(cpf: string): string {
    return cpf?.replace(/\D/g, '') ?? '';
  }
}
