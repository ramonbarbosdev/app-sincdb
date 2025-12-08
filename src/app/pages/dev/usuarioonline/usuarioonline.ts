import { Component, inject } from '@angular/core';
import { BaseService } from '../../../services/base.service';
import { Usuariosonline } from '../../../models/usuariosonline';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { WebsocketService } from '../../../services/websocket.service';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { CardModule } from 'primeng/card';
import { AvatarModule } from 'primeng/avatar';
import { ListboxModule } from 'primeng/listbox';
import { DataViewModule } from 'primeng/dataview';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-usuarioonline',
  imports: [
    FormsModule,
    CommonModule,
    TagModule,
    DividerModule,
    CardModule,
    ListboxModule,
    AvatarModule,
    DataViewModule,
  ],
  templateUrl: './usuarioonline.html',
  styleUrl: './usuarioonline.scss',
})
export class Usuarioonline {
  usuarios: Usuariosonline[] = [];
  carregando = false;

  public baseService = inject(BaseService);
  private wsService = inject(WebsocketService);
  private auth = inject(AuthService);

  ngOnInit() {
    const user = this.auth.getUserSubbject();
    const login = user?.login;

    this.wsService.getOnline().subscribe((data: any) => {
   
      if (data.login !== login) {
        this.carregarUsuarios();
      }
    });

    this.carregarUsuarios();
  }

  getInitials(name?: string): string {
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  carregarUsuarios() {
    this.carregando = true;
    this.baseService.findAll('usuarioonline/').subscribe({
      next: (res) => {
        this.usuarios = res;
        this.carregando = false;
      },
      error: (err) => {
        console.error('Erro ao carregar usuários online:', err);
        this.carregando = false;
      },
    });
  }
}
