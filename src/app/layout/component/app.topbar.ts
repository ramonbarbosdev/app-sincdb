import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { AppConfigurator } from './app.configurator';
import { LayoutService } from '../service/layout.service';
import { Menu } from 'primeng/menu';
import { AuthService } from '../../auth/auth.service';
import { AvatarModule } from 'primeng/avatar';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    RouterModule,
    CommonModule,
    StyleClassModule,
    Menu,
    AvatarModule,
  ],
  template: ` <div class="layout-topbar">
    <div class="layout-topbar-logo-container">
      <button
        class="layout-menu-button layout-topbar-action"
        (click)="layoutService.onMenuToggle()"
      >
        <i class="pi pi-bars"></i>
      </button>
      <a class="layout-topbar-logo" routerLink="/client/home">
        <span class="ml-10">
          <img
            *ngIf="!layoutService.isDarkTheme()"
            src="/logo.png"
            alt=""
            srcset=""
            class="w-40 "
          />
          <img
            *ngIf="layoutService.isDarkTheme()"
            src="/logo-light.png"
            alt=""
            srcset=""
            class="w-40 "
          />
        </span>
      </a>
    </div>

    <div class="layout-topbar-actions">
      <div class="layout-config-menu">
        <button
          type="button"
          class="layout-topbar-action"
          (click)="toggleDarkMode()"
        >
          <i
            [ngClass]="{
              'pi ': true,
              'pi-moon': layoutService.isDarkTheme(),
              'pi-sun': !layoutService.isDarkTheme()
            }"
          ></i>
        </button>
        <div class="relative">
          <!-- <button
            class="layout-topbar-action layout-topbar-action-highlight"
            pStyleClass="@next"
            enterFromClass="hidden"
            enterActiveClass="animate-scalein"
            leaveToClass="hidden"
            leaveActiveClass="animate-fadeout"
            [hideOnOutsideClick]="true"
          >
            <i class="pi pi-palette"></i>
          </button> -->
          <!-- <app-configurator /> -->
        </div>
      </div>

      <button
        class="layout-topbar-menu-button layout-topbar-action"
        pStyleClass="@next"
        enterFromClass="hidden"
        enterActiveClass="animate-scalein"
        leaveToClass="hidden"
        leaveActiveClass="animate-fadeout"
        [hideOnOutsideClick]="true"
      >
        <i class="pi pi-ellipsis-v"></i>
      </button>

      <div class="layout-topbar-menu hidden lg:block">
        <div class="layout-topbar-menu-content">

          <div>
            <p-menu #menu [popup]="true" [model]="menuPerfil"></p-menu>
            <button
              type="button"
              class="flex items-center gap-2 p-1 rounded  hover:bg-[var(--surface-hover)]"
              (click)="menu.toggle($event)"
            >
              <p-avatar [image]="avatarImg" shape="circle">
                <i *ngIf="!avatarImg" class="pi pi-user"></i>
              </p-avatar>
              <span>{{ avatarNome }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- <app-confirm-dialog
      [(displayConfirmation)]="displayConfirmation"
      [title]="confirmationTitle"
      [message]="confirmationMessage"
      [onConfirm]="confirmationAction"
    /> -->
  </div>`,
})
export class AppTopbar {
  items!: MenuItem[];

  constructor(public layoutService: LayoutService) {}
  private router = inject(Router);
  private auth = inject(AuthService);
  private cd = inject(ChangeDetectorRef);

  public avatarImg: string = '';
  public avatarNome: string = '';

  ngOnInit(): void {
    this.auth.user$.subscribe((user) => {
      this.avatarImg = user?.img || '';
      this.avatarNome = user?.nome || '';
      this.cd.markForCheck();
    });
  }

  toggleDarkMode() {
    this.layoutService.layoutConfig.update((state) => ({
      ...state,
      darkTheme: !state.darkTheme,
    }));
  }

  displayConfirmation: boolean = false;
  confirmationTitle: string = '';
  confirmationMessage: string = '';
  confirmationAction: () => void = () => {};

  openConfirmation(title: string, message: string, action: () => void) {
    this.confirmationTitle = title;
    this.confirmationMessage = message;
    this.confirmationAction = action;
    this.displayConfirmation = true;
  }

  logout() {
    this.auth.logout();
  }
  menuPerfil = [
    {
      label: 'Perfil',
      icon: 'pi pi-fw pi-user',
      command: () => {
        this.router.navigate(['client/perfil']);
      },
    },
    // {
    //   label: 'Configuração',
    //   icon: 'pi pi-fw pi-cog',
    // },
    {
      separator: true,
    },
    {
      label: 'Sair',
      icon: 'pi pi-fw pi-sign-out',
      command: () => {
        this.logout();
      },
    },
  ];
}
