import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, Observable, of, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoadingService } from '../services/loading.service';
import { BaseService } from '../services/base.service';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}`;

  private router = inject(Router);
  private baseService = inject(BaseService);
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

  findByLogin(login: string): Observable<any> {
    const url = `${this.apiUrl}/usuario/obter-login/${login}`;

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

  obterOrganizacao(credenciais: any): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/auth/obter-organizacao`, credenciais, { withCredentials: true })
      .pipe(
        tap((user: any) => {
          const userInfo = {
            token: user.tempToken,
          };

          this.userSubject.next(userInfo);
          sessionStorage.setItem('user', JSON.stringify(userInfo));
        }),
        catchError((e) => {
          console.log(e);
          this.exibirErros(e);
          return throwError(() => e);
        })
      );
  }

  login(credenciais: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, credenciais, { withCredentials: true }).pipe(
      tap((user) => {
        this.userSubject.next(user);
        sessionStorage.setItem('user', JSON.stringify(user));
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

    return this.http.get(`${this.apiUrl}/auth/me`, { withCredentials: true }).pipe(
      tap((user) => {}),
      catchError((error) => {
        this.userSubject.next(null);
        sessionStorage.removeItem('user');
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    this.http.post(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true }).subscribe({
      next: (res) => {
        this.router.navigate(['/auth/login']);
        this.userSubject.next(null);
        sessionStorage.removeItem('user');
        // ExibirSucesso(res);
      },
      error: (e) => {
        this.router.navigate(['/auth/login']);
        this.userSubject.next(null);
        sessionStorage.removeItem('user');
        // ExibirErros(e);
      },
    });
  }

  cadastrar(data: any): Observable<any> {
    const url = `${this.apiUrl}/auth/register`;

    return this.http.post(url, data).pipe(catchError((error) => throwError(() => error)));
  }

  getUser() {
    return this.userSubject.value;
  }

  getUserSubbject() {
    return this.userSubject.value;
  }
  isAuthenticated(): boolean {
    return !!this.userSubject.value;
  }

  updateUserAvatar(url: string) {
    const user = this.userSubject.value;
    if (user) {
      const updatedUser = { ...user, img: url };
      this.userSubject.next(updatedUser);
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
    }
  }

  updateUserNome(nome: string) {
    const user = this.userSubject.value;
    if (user) {
      const updatedUser = { ...user, nome: nome };
      this.userSubject.next(updatedUser);
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
    }
  }

  exibirErros(e: any) {
    this.messageService.add({
      severity: 'error',
      summary: e.error.message,
      detail: e.error.codeDescription,
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
