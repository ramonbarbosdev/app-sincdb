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
    if (this.auth.isDevRole()) {
      const desktopNotificationItem: MenuItem = {
        label: 'Notificações desktop',
        icon: 'pi pi-fw pi-bell',
        routerLink: ['/dev/desktop-notificacoes'],
      };

      this.model.push(
        {
          label: 'Início',
          items: [
            {
              label: 'Fórum',
              icon: 'pi pi-fw pi-megaphone',
              routerLink: ['/client/forum'],
            },
          ],
        },
        {
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
      },
      );
    } else {


      this.model = [
        {
          label: 'Início',
          items: [
            {
              label: 'Mapa de sincronização',
              icon: 'pi pi-fw pi-map',
              routerLink: ['/client/sincronizacao-diagrama'],
            },
            {
              label: 'Conexão',
              icon: 'pi pi-wifi',
              routerLink: ['/client/conexao'],
            },
            {
              label: 'Fórum',
              icon: 'pi pi-megaphone',
              routerLink: ['/client/forum'],
            },
          ],
        },
      ];

     
    }
  }
}
