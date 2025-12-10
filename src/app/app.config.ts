import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { provideEnvironmentNgxMask } from 'ngx-mask';
import { OrcaFacilTheme } from './theme/orcafacil-theme';
import { OrcaFacilDark } from './theme/orcafacil-dark.theme';
import { SyncDBTheme } from './theme/sincdb-theme';

export const appConfig: ApplicationConfig = {
  providers: [
    provideEnvironmentNgxMask(),
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    providePrimeNG({
      ripple: true,
      inputVariant: 'filled',
      theme: {
        preset: SyncDBTheme,
        options: { prefix: 'p', darkModeSelector: '.app-dark' },
      },
    }),
  ],
};
