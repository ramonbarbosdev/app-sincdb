import { inject } from '@angular/core';
import {
  HttpRequest,
  HttpInterceptorFn,
  HttpHandlerFn,
} from '@angular/common/http';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api'; 

export const Error401Interceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  const router = inject(Router);
  const messageService = inject(MessageService);

  return next(req).pipe(
    catchError(err => {
      if (err.status === 401) {
        messageService.add({ severity: 'error', summary: 'Acesso negado', detail: 'Você não tem permissão.' });
        // router.navigate(['/auth/access']);
      }
      return throwError(() => err);
    })
  );
};
