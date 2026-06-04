import { inject } from '@angular/core';
import {
  HttpRequest,
  HttpInterceptorFn,
  HttpHandlerFn,
} from '@angular/common/http';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

export const Error403Interceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError(err => {
      if (err.status === 403) {
        // messageService.add({ severity: 'error', summary: 'Acesso negado', detail: 'Você não tem permissão.' });
        router.navigate(['/auth/access']);
      }
      return throwError(() => err);
    })
  );
};
