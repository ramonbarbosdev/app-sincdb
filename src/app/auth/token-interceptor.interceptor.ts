import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from './auth.service';
import { inject } from '@angular/core';
import { criarAuthHeader } from './auth-header';

export const TokenInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isLogin = req.url.includes('/auth/login');
  const isRegister = req.url.includes('/auth/register');
  const isLogout = req.url.includes('/auth/logout');
  const isSelecionarOrganizacao = req.url.includes('/auth/selecionar-organizacao');

  if (isLogin || isRegister || isLogout || req.headers.has('Authorization')) {
    return next(req);
  }

  const token = isSelecionarOrganizacao ? auth.getTokenTemporario() : auth.getAccessToken();

  if (token) {
    const cloned = req.clone({
      setHeaders: criarAuthHeader(token),
    });
    return next(cloned);
  }

  return next(req);
};
