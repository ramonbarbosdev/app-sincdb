import { Routes } from '@angular/router';
import { AppLayout } from './layout/component/app.layout';
import { authGuard } from './auth/auth.guard';
import { Usuariolist } from './pages/dev/usuario/usuariolist/usuariolist';
import { Rolelist } from './pages/dev/role/rolelist/rolelist';
import { Empresalist } from './pages/dev/empresa/empresalist/empresalist';
import { HomeDev } from './pages/dev/home-dev/home-dev';
import { Planoassinaturalist } from './pages/dev/planoassinatura/planoassinaturalist/planoassinaturalist';
import { HomeClient } from './pages/client/home-client/home-client';

export const routes: Routes = [
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: 'auth', loadChildren: () => import('../app/pages/auth/auth.routes') },

  {
    path: 'dev',
    component: AppLayout,
    canActivateChild: [authGuard],
    data: { roles: ['dev'] },
    children: [
      { path: 'home', component: HomeDev },
      { path: 'usuario', component: Usuariolist },
      { path: 'role', component: Rolelist },
    ],
  },
  {
    path: 'client',
    component: AppLayout,
    canActivateChild: [authGuard],
    data: { roles: ['client', 'dev'] },
    children: [{ path: 'home', component: HomeClient }],
  },
];
