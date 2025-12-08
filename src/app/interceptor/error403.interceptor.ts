import { inject, Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpHandlerFn,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api'; // Se quiser mostrar toast

export const Error403Interceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  const router = inject(Router);
  const messageService = inject(MessageService);

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