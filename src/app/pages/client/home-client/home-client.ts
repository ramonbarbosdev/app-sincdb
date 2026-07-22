import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InfoAtividades } from "../../../components/info-atividades/info-atividades";
import { ComparativoEstrutura } from "../../../components/comparativo-estrutura/comparativo-estrutura";
import { BaseService } from '../../../services/base.service';
import { Conexao } from '../../../models/conexao';

@Component({
  selector: 'app-home-client',
  imports: [CommonModule, ButtonModule, InfoAtividades, ComparativoEstrutura],
  templateUrl: './home-client.html',
  styleUrl: './home-client.scss',
})
export class HomeClient {
  private baseService = inject(BaseService);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);

  loadingConexao = true;
  temConexaoPadrao = false;

  ngOnInit() {
    this.verificarConexaoPadrao();
  }

  verificarConexaoPadrao() {
    this.loadingConexao = true;
    this.baseService.findAll('conexao').subscribe({
      next: (res: any) => {
        const lista = Array.isArray(res) ? res : res?.conexoes || res?.items || res?.content || [];
        this.temConexaoPadrao = lista.some((item: Conexao) => item.fl_padrao) || lista.length > 0;
        this.loadingConexao = false;
        this.cd.markForCheck();
      },
      error: () => {
        this.temConexaoPadrao = false;
        this.loadingConexao = false;
        this.cd.markForCheck();
      },
    });
  }

  irParaConexao() {
    this.router.navigate(['/client/conexao']);
  }
}
