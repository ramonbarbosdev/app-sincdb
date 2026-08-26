import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Error403Interceptor } from './app/interceptor/error403.interceptor';
import { Error401Interceptor } from './app/interceptor/error401.interceptor';

import localePt from '@angular/common/locales/pt';
import { registerLocaleData } from '@angular/common';
import { LOCALE_ID } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TokenInterceptor } from './app/auth/token-interceptor.interceptor';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';

registerLocaleData(localePt, 'pt-BR');
//Dark como padrão
// document.documentElement.classList.add('app-dark'); 

bootstrapApplication(App, {
  providers: [
    ConfirmationService,
    MessageService,
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    provideHttpClient(
      withInterceptors([TokenInterceptor, Error403Interceptor, Error401Interceptor])
    ),
    provideRouter(routes),

    ...appConfig.providers,
  ],
}).catch((err) => console.error(err));
