import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from './auth.service';
import { inject } from '@angular/core';
import { criarAuthHeader } from './auth-header';

export const TokenInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getAccessToken();
  
  if (token) {
    const cloned = req.clone({
      setHeaders: criarAuthHeader(token),
    });
    return next(cloned);
  }

  return next(req);
};
