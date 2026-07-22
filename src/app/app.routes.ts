import { Routes } from '@angular/router';
import { AppLayout } from './layout/component/app.layout';
import { authGuard } from './auth/auth.guard';
import { Usuariolist } from './pages/dev/usuario/usuariolist/usuariolist';
import { Rolelist } from './pages/dev/role/rolelist/rolelist';
import { Empresalist } from './pages/dev/empresa/empresalist/empresalist';
import { HomeDev } from './pages/dev/home-dev/home-dev';
import { Planoassinaturalist } from './pages/dev/planoassinatura/planoassinaturalist/planoassinaturalist';
import { HomeClient } from './pages/client/home-client/home-client';
import { Conexaoform } from './pages/client/conexao/conexaoform/conexaoform';
import { Estruturaform } from './pages/client/estrutura/estruturaform/estruturaform';
import { Dadosform } from './pages/dados/dadosform/dadosform';
import { Perfil } from './pages/client/perfil/perfil';
import { ParametroMasterList } from './pages/dev/parametros/parametro-master-list/parametro-master-list';
import { SeasonalAdminPage } from './pages/dev/seasonal-admin/seasonal-admin';
import { ExploradorVisualPage } from './features/explorador-visual/pages/explorador-visual.page';
import { SqlEditorPage } from './features/sql-editor/pages/sql-editor.page';

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
      { path: 'planoassinatura', component: Planoassinaturalist },
      { path: 'empresa', component: Empresalist },
      { path: 'parametro', component: ParametroMasterList },
      { path: 'sazonal', component: SeasonalAdminPage },
    ],
  },
  {
    path: 'client',
    component: AppLayout,
    canActivateChild: [authGuard],
    data: { roles: ['client', 'dev'] },
    children: [
      { path: 'home', component: HomeClient },
      { path: 'perfil', component: Perfil },
      { path: 'explorador', component: ExploradorVisualPage },
      { path: 'sql-editor', component: SqlEditorPage },
      { path: 'conexao', component: Conexaoform },
      { path: 'estrutura', component: Estruturaform },
      { path: 'dados', component: Dadosform }
    ],
  },
];
