import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { AuthService } from '../../../auth/auth.service';
import { BaseService } from '../../../services/base.service';

export type FeedbackComposeTipo = 'bug' | 'sugestao';
export type FeedbackFiltro = 'todos' | 'bug' | 'sugestao';

export interface FeedbackReport {
  id?: string;
  tipo: 'BUG' | 'SUGESTAO';
  titulo: string;
  descricao: string;
  usuario?: string;
  nomeUsuario?: string;
  createdAt?: string;
}

@Component({
  selector: 'app-feedback-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    TagModule,
  ],
  templateUrl: './feedback.page.html',
  styleUrl: './feedback.page.scss',
})
export class FeedbackPage {
  private baseService = inject(BaseService);
  private messageService = inject(MessageService);
  private auth = inject(AuthService);
  private cd = inject(ChangeDetectorRef);

  tipoCompose: FeedbackComposeTipo = 'bug';
  filtroFeed: FeedbackFiltro = 'todos';
  verFeedGlobal = true;

  titulo = '';
  descricao = '';
  enviando = false;
  carregando = false;

  meusEnvios: FeedbackReport[] = [];
  enviosAdmin: FeedbackReport[] = [];
  isDev = false;

  ngOnInit(): void {
    this.isDev = this.auth.getRoleOrganizacaoAtiva() === 'ROLE_DEV';
    this.carregarEnvios();
  }

  tipoAtual(): 'BUG' | 'SUGESTAO' {
    return this.tipoCompose === 'bug' ? 'BUG' : 'SUGESTAO';
  }

  feedItens(): FeedbackReport[] {
    const base =
      this.isDev && this.verFeedGlobal ? this.enviosAdmin : this.meusEnvios;

    if (this.filtroFeed === 'bug') {
      return base.filter((item) => item.tipo === 'BUG');
    }
    if (this.filtroFeed === 'sugestao') {
      return base.filter((item) => item.tipo === 'SUGESTAO');
    }
    return base;
  }

  nomeUsuario(): string {
    const user = this.auth.getUser();
    return user?.nmUsuario || user?.nome || 'Você';
  }

  nomeExibicao(item: FeedbackReport): string {
    const nome = item.nomeUsuario?.trim();
    if (nome && nome !== item.usuario && !this.pareceIdMongo(nome)) {
      return nome;
    }
    return 'Usuário';
  }

  private pareceIdMongo(value?: string): boolean {
    return !!value && /^[a-f0-9]{24}$/i.test(value);
  }

  iniciaisUsuario(): string {
    return this.iniciais(this.nomeUsuario());
  }

  iniciais(nome?: string): string {
    const texto = (nome || 'U').trim();
    const partes = texto.split(/\s+/).filter(Boolean);
    if (partes.length >= 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return texto.slice(0, 2).toUpperCase();
  }

  enviar(): void {
    const titulo = this.titulo.trim();
    const descricao = this.descricao.trim();

    if (titulo.length < 3) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Título curto',
        detail: 'Use pelo menos 3 caracteres no título.',
      });
      return;
    }

    if (descricao.length < 10) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Descrição curta',
        detail: 'Descreva com pelo menos 10 caracteres.',
      });
      return;
    }

    this.enviando = true;
    this.baseService
      .create('feedback', {
        tipo: this.tipoAtual(),
        titulo,
        descricao,
      })
      .subscribe({
        next: () => {
          this.enviando = false;
          this.titulo = '';
          this.descricao = '';
          this.messageService.add({
            severity: 'success',
            summary: 'Publicado',
            detail:
              this.tipoCompose === 'bug'
                ? 'Bug publicado no feed.'
                : 'Sugestão publicada no feed.',
          });
          this.carregarEnvios();
          this.cd.markForCheck();
        },
        error: (err) => {
          this.enviando = false;
          this.baseService.exibirErros(err);
          this.cd.markForCheck();
        },
      });
  }

  carregarEnvios(): void {
    this.carregando = true;
    this.baseService.findAll('feedback').subscribe({
      next: (res) => {
        this.meusEnvios = Array.isArray(res) ? res : [];
        this.carregando = false;
        if (this.isDev) {
          this.carregarAdmin();
        } else {
          this.cd.markForCheck();
        }
      },
      error: () => {
        this.meusEnvios = [];
        this.carregando = false;
        this.cd.markForCheck();
      },
    });
  }

  private carregarAdmin(): void {
    this.baseService.findAll('feedback/admin').subscribe({
      next: (res) => {
        this.enviosAdmin = Array.isArray(res) ? res : [];
        this.cd.markForCheck();
      },
      error: () => {
        this.enviosAdmin = [];
        this.cd.markForCheck();
      },
    });
  }

  labelTipo(tipo: string): string {
    return tipo === 'BUG' ? 'Bug' : 'Sugestão';
  }

  severityTipo(tipo: string): 'danger' | 'info' {
    return tipo === 'BUG' ? 'danger' : 'info';
  }
}
