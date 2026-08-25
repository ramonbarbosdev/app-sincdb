import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { InfoAtividades } from "../../../components/info-atividades/info-atividades";
import { ComparativoEstrutura } from "../../../components/comparativo-estrutura/comparativo-estrutura";
import { CloudLocalPulse } from '../../../components/cloud-local-pulse/cloud-local-pulse';
import { BaseService } from '../../../services/base.service';
import { Conexao } from '../../../models/conexao';
import { getOperacaoMap } from '../../../map/operacao.map';
import { getStatusSincronizadoMap } from '../../../map/statusSincronizacao.map';

type ProximoPasso = 'conexao' | 'estrutura' | 'dados' | 'ok';

@Component({
  selector: 'app-home-client',
  imports: [
    CommonModule,
    ButtonModule,
    SkeletonModule,
    TagModule,
    InfoAtividades,
    ComparativoEstrutura,
    CloudLocalPulse,
  ],
  templateUrl: './home-client.html',
  styleUrl: './home-client.scss',
})
export class HomeClient {
  private baseService = inject(BaseService);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);

  loading = true;
  temConexaoPadrao = false;
  conexaoPadrao?: Conexao;
  ultimaAtividade?: {
    baseNome: string;
    schemaNome: string;
    operacao: string;
    operacaoRaw: string;
    status: string;
    statusRaw: string;
    ultimaExecucao: string;
  };
  proximoPasso: ProximoPasso = 'conexao';

  ngOnInit() {
    this.carregarStatus();
  }

  carregarStatus() {
    this.loading = true;

    this.baseService.findAll('conexao').subscribe({
      next: (res: any) => {
        const lista = Array.isArray(res) ? res : res?.conexoes || res?.items || res?.content || [];
        const normalizadas = lista.map((item: any) => ({
          ...item,
          db_cloud_host: item.db_cloud_host ?? item.cloud?.db_cloud_host,
          db_local_host: item.db_local_host ?? item.local?.db_local_host,
        }));
        this.conexaoPadrao =
          normalizadas.find((item: Conexao) => item.fl_padrao) || normalizadas[0];
        this.temConexaoPadrao = !!this.conexaoPadrao;
        this.carregarAtividade();
      },
      error: () => {
        this.temConexaoPadrao = false;
        this.proximoPasso = 'conexao';
        this.loading = false;
        this.cd.markForCheck();
      },
    });
  }

  private carregarAtividade() {
    this.baseService.findAll('info/atividade').subscribe({
      next: (res: any) => {
        const lista = Array.isArray(res) ? res : [];
        if (lista.length) {
          const item = lista[0];
          this.ultimaAtividade = {
            baseNome: item.baseNome,
            schemaNome: item.schemaNome,
            operacaoRaw: item.operacao || '',
            operacao: getOperacaoMap(item.operacao),
            statusRaw: item.status || '',
            status: getStatusSincronizadoMap(item.status),
            ultimaExecucao: item.ultimaExecucao,
          };
        }
        this.definirProximoPasso();
        this.loading = false;
        this.cd.markForCheck();
      },
      error: () => {
        this.definirProximoPasso();
        this.loading = false;
        this.cd.markForCheck();
      },
    });
  }

  private definirProximoPasso() {
    if (!this.temConexaoPadrao) {
      this.proximoPasso = 'conexao';
      return;
    }
    if (!this.ultimaAtividade) {
      this.proximoPasso = 'estrutura';
      return;
    }
    if (this.temErroUltimaSync) {
      const op = (this.ultimaAtividade.operacaoRaw || this.ultimaAtividade.operacao || '').toUpperCase();
      this.proximoPasso = op.includes('DADOS') ? 'dados' : 'estrutura';
      return;
    }
    const op = (this.ultimaAtividade.operacaoRaw || this.ultimaAtividade.operacao || '').toUpperCase();
    if (op.includes('ESTRUTURA')) {
      this.proximoPasso = 'dados';
      return;
    }
    this.proximoPasso = 'ok';
  }

  get temErroUltimaSync(): boolean {
    const raw = (this.ultimaAtividade?.statusRaw || '').toUpperCase();
    const label = (this.ultimaAtividade?.status || '').toLowerCase();
    return (
      raw.includes('ERRO') ||
      label.includes('erro') ||
      label.includes('desatualizado') ||
      label.includes('não está sincronizado') ||
      label.includes('nao esta sincronizado')
    );
  }

  get statusSeverity(): 'success' | 'danger' | 'warn' | 'secondary' {
    const raw = (this.ultimaAtividade?.statusRaw || '').toUpperCase();
    const label = (this.ultimaAtividade?.status || '').toLowerCase();

    if (raw.includes('ERRO') || label.includes('erro')) {
      return 'danger';
    }
    if (raw.includes('PROCESSANDO') || label.includes('processando')) {
      return 'warn';
    }
    if (
      raw.includes('SINCRONIZADO') ||
      label.includes('ok') ||
      label.includes('sucesso') ||
      label.includes('sincronizado')
    ) {
      return 'success';
    }
    if (raw.includes('DESATUALIZADO') || label.includes('desatualizado')) {
      return 'warn';
    }
    return 'secondary';
  }

  get statusTitulo(): string {
    if (!this.temConexaoPadrao) {
      return 'Comece conectando Cloud e Local';
    }
    if (this.temErroUltimaSync) {
      return 'A última sincronização falhou';
    }
    if (!this.ultimaAtividade) {
      return 'Conexão pronta — sincronize a estrutura';
    }
    if (this.proximoPasso === 'dados') {
      return 'Estrutura ok — sincronize os dados';
    }
    return 'Tudo alinhado';
  }

  get statusSubtitulo(): string {
    if (!this.temConexaoPadrao) {
      return 'Cadastre uma conexão padrão para liberar estrutura e dados.';
    }
    if (this.temErroUltimaSync && this.ultimaAtividade) {
      return `Revise ${this.ultimaAtividade.baseNome}/${this.ultimaAtividade.schemaNome} e tente novamente.`;
    }
    if (this.ultimaAtividade) {
      return `${this.ultimaAtividade.baseNome}/${this.ultimaAtividade.schemaNome} · ${this.ultimaAtividade.operacao}`;
    }
    return `${this.conexaoPadrao?.nm_conexao || 'Conexão padrão'} configurada. Próximo passo: alinhar a estrutura.`;
  }

  get ctaLabel(): string {
    if (this.temErroUltimaSync) {
      return this.proximoPasso === 'dados' ? 'Revisar sincronização de dados' : 'Revisar sincronização de estrutura';
    }
    switch (this.proximoPasso) {
      case 'conexao':
        return 'Cadastrar conexão';
      case 'estrutura':
        return 'Sincronizar estrutura';
      case 'dados':
        return 'Sincronizar dados';
      default:
        return 'Ver conexões';
    }
  }

  get ctaIcon(): string {
    if (this.temErroUltimaSync) {
      return 'pi pi-replay';
    }
    switch (this.proximoPasso) {
      case 'conexao':
        return 'pi pi-database';
      case 'estrutura':
        return 'pi pi-sitemap';
      case 'dados':
        return 'pi pi-sync';
      default:
        return 'pi pi-arrow-right';
    }
  }

  get hostCloudCurto(): string {
    return this.encurtarHost(this.conexaoPadrao?.db_cloud_host);
  }

  get hostLocalCurto(): string {
    return this.encurtarHost(this.conexaoPadrao?.db_local_host);
  }

  executarCta() {
    switch (this.proximoPasso) {
      case 'conexao':
        this.router.navigate(['/client/conexao']);
        break;
      case 'estrutura':
        this.router.navigate(['/client/estrutura']);
        break;
      case 'dados':
        this.router.navigate(['/client/dados']);
        break;
      default:
        this.router.navigate(['/client/conexao']);
    }
  }

  irParaMapaSincronizacao() {
    this.router.navigate(['/client/sincronizacao-diagrama']);
  }

  private encurtarHost(host?: string): string {
    if (!host) {
      return '—';
    }
    if (host.length <= 28) {
      return host;
    }
    return `${host.slice(0, 14)}…${host.slice(-10)}`;
  }
}
