import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { LoadingService } from '../../services/loading.service';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, AppMenuitem, RouterModule],
  template: `<ul class="layout-menu">
    <ng-container *ngFor="let item of model; let i = index">
      <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
      <li *ngIf="item.separator" class="menu-separator"></li>
    </ng-container>
  </ul> `,
})
export class AppMenu {
  model: MenuItem[] = [];
  auth = inject(AuthService);

  ngOnInit() {
    const role = this.auth.getRoleOrganizacaoAtiva();

    if (role === 'ROLE_DEV') {
      this.model.push({
        label: 'Administração',
        items: [
          {
            label: 'Painel',
            icon: 'pi pi-fw pi-bookmark',
            routerLink: ['/dev/home'],
          },
          {
            label: 'Planos',
            icon: 'pi pi-fw pi-bookmark',
            routerLink: ['/dev/planoassinatura'],
          },
          {
            label: 'Empresas',
            icon: 'pi pi-fw pi-bookmark',
            routerLink: ['/dev/empresa'],
          },
          {
            label: 'Permissões',
            icon: 'pi pi-fw pi-bookmark',
            routerLink: ['/dev/role'],
          },
          {
            label: 'Usuarios',
            icon: 'pi pi-fw pi-bookmark',
            routerLink: ['/dev/usuario'],
          },
          {
            label: 'Parâmetros',
            icon: 'pi pi-fw pi-bookmark',
            routerLink: ['/dev/parametro'],
          },
          {
            label: 'Experiências sazonais',
            icon: 'pi pi-fw pi-sparkles',
            routerLink: ['/dev/sazonal'],
          },
        ],
      });
    } else {


      this.model = [
        {
          label: 'Início',
          items: [
            {
              label: 'Painel Principal',
              icon: 'pi pi-fw pi-home',
              routerLink: ['/client/home'],
            },
          ],
        },
        {
          label: 'Operações',
          items: [
            // {
            //   label: 'Explorador Visual',
            //   icon: 'pi pi-share-alt',
            //   routerLink: ['/client/explorador'],
            // },
            {
              label: 'Conexão',
              icon: 'pi pi-wifi',
              routerLink: ['/client/conexao'],
            },
            {
              label: 'Estruturas',
              icon: 'pi pi-sitemap',
              routerLink: ['/client/estrutura'],
            },
            {
              label: 'Dados',
              icon: 'pi pi-database',
              routerLink: ['/client/dados'],
            },
            {
              label: 'Mapa de sincronização',
              icon: 'pi pi-map',
              routerLink: ['/client/sincronizacao-diagrama'],
            },
            {
              label: 'SQL Editor',
              icon: 'pi pi-code',
              routerLink: ['/client/sql-editor'],
            },
          ],
        },
      ];

     
    }
  }
}
