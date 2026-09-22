import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { AuthService } from '../../../auth/auth.service';
import {
  ForumComposeTipo,
  ForumEstadoGeral,
  ForumFiltro,
  ForumMetricas,
  ForumOrdenacao,
  ForumPost,
  ForumService,
  ForumSystemStatus,
} from '../../../services/forum.service';

@Component({
  selector: 'app-forum-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    TagModule,
    SelectModule,
  ],
  templateUrl: './forum.page.html',
  styleUrl: './forum.page.scss',
})
export class ForumPage {
  private forum = inject(ForumService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private auth = inject(AuthService);
  private cd = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  /** Foto do usuário logado (atualiza ao salvar o perfil). */
  fotoPerfilSessao = '';

  metricas?: ForumMetricas;
  posts: ForumPost[] = [];

  tipoCompose: ForumComposeTipo = 'bug';
  filtroFeed: ForumFiltro = 'todos';
  ordenacao: ForumOrdenacao = 'destaque';

  titulo = '';
  descricao = '';
  enviando = false;
  carregandoInicial = true;
  carregandoFeed = false;

  private readonly destaqueMinCurtidas = 3;
  private readonly destaqueTopN = 3;

  isDev = false;

  statusDialogVisible = false;
  salvandoStatus = false;
  statusForm: ForumSystemStatus = {
    estadoGeral: 'OPERACIONAL',
    titulo: '',
    mensagem: '',
    proximaVersao: '',
    previsaoRelease: '',
  };

  editDialogVisible = false;
  editando = false;
  editPostId?: string;
  editTipo: ForumComposeTipo = 'bug';
  editTitulo = '';
  editDescricao = '';

  statusPostEmProgresso = new Set<string>();

  estadoOptions = [
    { label: 'Operacional', value: 'OPERACIONAL' as ForumEstadoGeral },
    { label: 'Degradado', value: 'DEGRADADO' as ForumEstadoGeral },
    { label: 'Manutenção', value: 'MANUTENCAO' as ForumEstadoGeral },
  ];

  ngOnInit(): void {
    this.isDev = this.auth.getRoleOrganizacaoAtiva() === 'ROLE_DEV';
    this.fotoPerfilSessao = this.normalizarUrlFoto(this.auth.getUser()?.img);
    this.auth.user$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.fotoPerfilSessao = this.normalizarUrlFoto(user?.img);
        this.atualizarFotosPostsDoUsuarioAtual();
        this.cd.markForCheck();
      });
    this.recarregar();
  }

  recarregar(): void {
    this.carregandoInicial = true;
    this.forum.getMetricas().subscribe({
      next: (m) => {
        this.metricas = m;
        this.carregarPosts(true);
      },
      error: () => {
        this.metricas = undefined;
        this.carregarPosts(true);
      },
    });
  }

  private recarregarMetricas(): void {
    this.forum.getMetricas().subscribe({
      next: (m) => {
        this.metricas = m;
        this.cd.markForCheck();
      },
      error: () => this.cd.markForCheck(),
    });
  }

  carregarPosts(inicial = false): void {
    if (!inicial) {
      this.carregandoFeed = true;
    }
    this.forum.getPosts(this.filtroFeed, this.ordenacao).subscribe({
      next: (posts) => {
        this.posts = posts;
        this.atualizarFotosPostsDoUsuarioAtual();
        this.carregandoInicial = false;
        this.carregandoFeed = false;
        this.cd.markForCheck();
      },
      error: () => {
        this.posts = [];
        this.carregandoInicial = false;
        this.carregandoFeed = false;
        this.cd.markForCheck();
      },
    });
  }

  aplicarFiltro(filtro: ForumFiltro): void {
    if (this.filtroFeed === filtro) return;
    this.filtroFeed = filtro;
    this.carregarPosts();
  }

  aplicarOrdenacao(ord: ForumOrdenacao): void {
    if (this.ordenacao === ord) return;
    this.ordenacao = ord;
    this.aplicarOrdenacaoLocal();
    this.cd.markForCheck();
  }

  tipoApi(): 'BUG' | 'SUGESTAO' {
    return this.tipoCompose === 'bug' ? 'BUG' : 'SUGESTAO';
  }

  enviar(): void {
    const titulo = this.titulo.trim();
    const descricao = this.descricao.trim();
    if (titulo.length < 3 || descricao.length < 10) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos inválidos',
        detail: 'Preencha título (3+) e descrição (10+).',
      });
      return;
    }

    this.enviando = true;
    this.forum.createPost({ tipo: this.tipoApi(), titulo, descricao }).subscribe({
      next: (created) => {
        this.enviando = false;
        this.titulo = '';
        this.descricao = '';
        this.messageService.add({
          severity: 'success',
          summary: 'Publicado',
          detail: 'Post adicionado ao fórum.',
        });
        if (this.postCombinaFiltro(created)) {
          this.posts = [created, ...this.posts.filter((p) => p.id !== created.id)];
          this.aplicarOrdenacaoLocal();
        }
        this.recarregarMetricas();
        this.cd.markForCheck();
      },
      error: (err) => {
        this.enviando = false;
        this.exibirErro(err);
        this.cd.markForCheck();
      },
    });
  }

  curtir(post: ForumPost): void {
    const prevCount = post.curtidasCount;
    const prevLiked = post.curtidoPorMim;

    post.curtidoPorMim = !post.curtidoPorMim;
    post.curtidasCount = Math.max(0, post.curtidasCount + (post.curtidoPorMim ? 1 : -1));
    this.aplicarOrdenacaoLocal();
    this.cd.markForCheck();

    this.forum.toggleCurtida(post.id).subscribe({
      next: (res) => {
        post.curtidasCount = res.curtidasCount;
        post.curtidoPorMim = res.curtidoPorMim;
        this.aplicarOrdenacaoLocal();
        this.cd.markForCheck();
      },
      error: (err) => {
        post.curtidasCount = prevCount;
        post.curtidoPorMim = prevLiked;
        this.aplicarOrdenacaoLocal();
        this.exibirErro(err);
        this.cd.markForCheck();
      },
    });
  }

  abrirEditar(post: ForumPost): void {
    this.editPostId = post.id;
    this.editTipo = post.tipo === 'BUG' ? 'bug' : 'sugestao';
    this.editTitulo = post.titulo;
    this.editDescricao = post.descricao;
    this.editDialogVisible = true;
  }

  salvarEdicao(): void {
    if (!this.editPostId) return;
    const titulo = this.editTitulo.trim();
    const descricao = this.editDescricao.trim();
    if (titulo.length < 3 || descricao.length < 10) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos inválidos',
        detail: 'Preencha título (3+) e descrição (10+).',
      });
      return;
    }

    this.editando = true;
    this.forum
      .updatePost(this.editPostId, {
        tipo: this.editTipo === 'bug' ? 'BUG' : 'SUGESTAO',
        titulo,
        descricao,
      })
      .subscribe({
        next: (updated) => {
          this.editando = false;
          this.editDialogVisible = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Atualizado',
            detail: 'Post editado com sucesso.',
          });
          const idx = this.posts.findIndex((p) => p.id === updated.id);
          if (idx >= 0) {
            if (this.postCombinaFiltro(updated)) {
              this.posts[idx] = updated;
              this.aplicarOrdenacaoLocal();
            } else {
              this.posts = this.posts.filter((p) => p.id !== updated.id);
            }
          }
          this.recarregarMetricas();
          this.cd.markForCheck();
        },
        error: (err) => {
          this.editando = false;
          this.exibirErro(err);
          this.cd.markForCheck();
        },
      });
  }

  excluir(post: ForumPost): void {
    this.confirmationService.confirm({
      message: `Excluir "${post.titulo}"?`,
      header: 'Confirmar exclusão',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Excluir',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.forum.deletePost(post.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Removido',
              detail: 'Post excluído.',
            });
            this.posts = this.posts.filter((p) => p.id !== post.id);
            this.recarregarMetricas();
            this.cd.markForCheck();
          },
          error: (err) => this.exibirErro(err),
        });
      },
    });
  }

  abrirStatusDialog(): void {
    const s = this.metricas?.status;
    this.statusForm = {
      estadoGeral: s?.estadoGeral ?? 'OPERACIONAL',
      titulo: s?.titulo ?? '',
      mensagem: s?.mensagem ?? '',
      proximaVersao: s?.proximaVersao ?? '',
      previsaoRelease: s?.previsaoRelease ?? '',
    };
    this.statusDialogVisible = true;
  }

  salvarStatus(): void {
    this.salvandoStatus = true;
    this.forum.updateStatus(this.statusForm).subscribe({
      next: (status) => {
        this.salvandoStatus = false;
        this.statusDialogVisible = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Status atualizado',
          detail: 'Painel do fórum atualizado para todos.',
        });
        if (this.metricas) {
          this.metricas = { ...this.metricas, status };
        }
        this.cd.markForCheck();
      },
      error: (err) => {
        this.salvandoStatus = false;
        this.exibirErro(err);
        this.cd.markForCheck();
      },
    });
  }

  nomeUsuario(): string {
    const user = this.auth.getUser();
    return user?.nmUsuario || user?.nome || 'Você';
  }

  fotoUsuarioAtual(): string | undefined {
    return this.fotoPerfilSessao || undefined;
  }

  fotoPost(post: ForumPost): string | undefined {
    const daApi = this.normalizarUrlFoto(post.imgUsuario);
    if (daApi) return daApi;
    if (this.isPostDoUsuarioAtual(post)) {
      return this.fotoUsuarioAtual();
    }
    return undefined;
  }

  iniciais(nome?: string): string {
    const texto = (nome || 'U').trim();
    const partes = texto.split(/\s+/).filter(Boolean);
    if (partes.length >= 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return texto.slice(0, 2).toUpperCase();
  }

  /** Gradiente estável por usuário (lista e composer). */
  avatarGradient(seed?: string | null): string {
    const h = this.avatarHue(seed);
    const h2 = (h + 32) % 360;
    return `linear-gradient(135deg, hsl(${h} 58% 50%), hsl(${h2} 52% 38%))`;
  }

  avatarSeedPost(post: ForumPost): string {
    return post.idUsuario || post.nomeUsuario || post.id;
  }

  private isPostDoUsuarioAtual(post: ForumPost): boolean {
    const user = this.auth.getUser();
    if (!post.idUsuario || !user) return false;
    const chaves = new Set(
      [user.idUsuario, user.login, user.nuCpf, this.auth.getUsuarioLogin()].filter(
        (v): v is string => typeof v === 'string' && v.length > 0
      )
    );
    return chaves.has(post.idUsuario);
  }

  private atualizarFotosPostsDoUsuarioAtual(): void {
    const img = this.fotoPerfilSessao || undefined;
    for (const post of this.posts) {
      if (this.isPostDoUsuarioAtual(post)) {
        post.imgUsuario = img;
      }
    }
  }

  private normalizarUrlFoto(url?: string | null): string {
    const trimmed = url?.trim();
    return trimmed || '';
  }

  private avatarHue(seed?: string | null): number {
    const s = (seed || 'usuario').trim().toLowerCase();
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = (hash * 31 + s.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % 360;
  }

  labelTipo(tipo: string): string {
    return tipo === 'BUG' ? 'Bug' : 'Sugestão';
  }

  severityTipo(tipo: string): 'danger' | 'info' {
    return tipo === 'BUG' ? 'danger' : 'info';
  }

  severityEstado(estado?: ForumEstadoGeral): 'success' | 'warn' | 'danger' {
    if (estado === 'DEGRADADO') return 'warn';
    if (estado === 'MANUTENCAO') return 'danger';
    return 'success';
  }

  labelEstado(estado?: ForumEstadoGeral): string {
    if (estado === 'DEGRADADO') return 'Degradado';
    if (estado === 'MANUTENCAO') return 'Manutenção';
    return 'Operacional';
  }

  postFechado(post: ForumPost): boolean {
    if (post.tipo === 'BUG') return post.statusPost === 'RESOLVIDO';
    return post.statusPost === 'IMPLEMENTADO';
  }

  labelStatusPost(post: ForumPost): string | null {
    if (post.tipo === 'BUG' && post.statusPost === 'RESOLVIDO') return 'Resolvido';
    if (post.tipo === 'SUGESTAO' && post.statusPost === 'IMPLEMENTADO') return 'Implementado';
    return null;
  }

  podeMarcarResolvido(post: ForumPost): boolean {
    return this.isDev && post.tipo === 'BUG' && post.statusPost !== 'RESOLVIDO';
  }

  podeMarcarImplementado(post: ForumPost): boolean {
    return this.isDev && post.tipo === 'SUGESTAO' && post.statusPost !== 'IMPLEMENTADO';
  }

  marcarResolvido(post: ForumPost): void {
    this.alterarStatusPost(post, 'RESOLVIDO', 'Bug marcado como resolvido.');
  }

  marcarImplementado(post: ForumPost): void {
    this.alterarStatusPost(post, 'IMPLEMENTADO', 'Sugestão marcada como implementada.');
  }

  private alterarStatusPost(
    post: ForumPost,
    status: 'RESOLVIDO' | 'IMPLEMENTADO',
    mensagemSucesso: string
  ): void {
    this.statusPostEmProgresso.add(post.id);
    this.forum.patchPostStatus(post.id, status).subscribe({
      next: (updated) => {
        this.statusPostEmProgresso.delete(post.id);
        const idx = this.posts.findIndex((p) => p.id === updated.id);
        if (idx >= 0) {
          this.posts[idx] = updated;
        }
        this.messageService.add({
          severity: 'success',
          summary: 'Status atualizado',
          detail: mensagemSucesso,
        });
        this.recarregarMetricas();
        this.cd.markForCheck();
      },
      error: (err) => {
        this.statusPostEmProgresso.delete(post.id);
        this.exibirErro(err);
        this.cd.markForCheck();
      },
    });
  }

  statusPostCarregando(postId: string): boolean {
    return this.statusPostEmProgresso.has(postId);
  }

  destacarPost(post: ForumPost): void {
    this.alterarDestaque(post, true);
  }

  removerDestaque(post: ForumPost): void {
    this.alterarDestaque(post, false);
  }

  private alterarDestaque(post: ForumPost, destacar: boolean): void {
    this.statusPostEmProgresso.add(post.id);
    this.forum.patchDestaque(post.id, destacar).subscribe({
      next: (updated) => {
        this.statusPostEmProgresso.delete(post.id);
        const idx = this.posts.findIndex((p) => p.id === updated.id);
        if (idx >= 0) {
          this.posts[idx] = updated;
          this.aplicarOrdenacaoLocal();
        }
        this.messageService.add({
          severity: 'success',
          summary: destacar ? 'Em destaque' : 'Destaque removido',
          detail: destacar
            ? 'Publicação destacada manualmente.'
            : 'Publicação removida dos destaques.',
        });
        this.cd.markForCheck();
      },
      error: (err) => {
        this.statusPostEmProgresso.delete(post.id);
        this.exibirErro(err);
        this.cd.markForCheck();
      },
    });
  }

  private postCombinaFiltro(post: ForumPost): boolean {
    if (this.filtroFeed === 'bug') return post.tipo === 'BUG';
    if (this.filtroFeed === 'sugestao') return post.tipo === 'SUGESTAO';
    return true;
  }

  private aplicarOrdenacaoLocal(): void {
    this.recalcularDestaques(this.posts);
    if (this.ordenacao === 'recente') {
      this.posts.sort((a, b) => this.compareRecente(a, b));
    } else {
      this.posts.sort((a, b) => this.compareDestaque(a, b));
    }
  }

  private recalcularDestaques(posts: ForumPost[]): void {
    const destaqueIds = new Set<string>();
    for (const p of posts) {
      if (p.destaqueManual) {
        destaqueIds.add(p.id);
      }
    }
    const auto = posts.filter((p) => !p.destaqueExcluido);
    for (const p of auto) {
      if (p.curtidasCount >= this.destaqueMinCurtidas) {
        destaqueIds.add(p.id);
      }
    }
    [...auto]
      .sort((a, b) => this.compareDestaque(a, b))
      .slice(0, this.destaqueTopN)
      .forEach((p) => destaqueIds.add(p.id));
    for (const p of posts) {
      p.emDestaque = destaqueIds.has(p.id);
    }
  }

  private compareDestaque(a: ForumPost, b: ForumPost): number {
    if (b.curtidasCount !== a.curtidasCount) {
      return b.curtidasCount - a.curtidasCount;
    }
    return this.compareRecente(a, b);
  }

  private compareRecente(a: ForumPost, b: ForumPost): number {
    const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
    const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
    return tb - ta;
  }

  private exibirErro(err: unknown): void {
    const msg =
      (err as { error?: { message?: string } })?.error?.message ||
      'Não foi possível concluir a operação.';
    this.messageService.add({ severity: 'error', summary: 'Erro', detail: msg });
  }
}
