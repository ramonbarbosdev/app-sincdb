import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from './auth.service';
import { inject } from '@angular/core';

export const TenantInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const user = auth.getUserSubbject();
  const idTenant = user?.idTenant;

  let headers = req.headers;
  if (idTenant) {
    headers = headers.set('X-Tenant-ID', idTenant);
  }

  // console.log(headers);

  const authReq = req.clone({ headers });
  return next(authReq);
};
