import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { BaseService } from '../../services/base.service';
import { TreeTableModule } from 'primeng/treetable';
import { TagModule } from 'primeng/tag';
import { CommonModule } from '@angular/common';
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { Popover, PopoverModule } from 'primeng/popover';
import { ViewChild } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-comparativo-estrutura',
  imports: [TreeTableModule, TagModule, CommonModule, SkeletonModule, ButtonModule, TooltipModule, PopoverModule],
  templateUrl: './comparativo-estrutura.html',
  styleUrl: './comparativo-estrutura.scss',
})
export class ComparativoEstrutura {
  private baseService = inject(BaseService);
  private cd = inject(ChangeDetectorRef);

  nodes: any[] = [];
  loading = true;
  endpoint = 'info';
  router = inject(Router);

  ngOnInit() {
    this.loadBases();
  }

  loadBases() {
    this.loading = true;

    this.baseService.findAll(`${this.endpoint}/comparativo/bases`).subscribe({
      next: (res: any) => {

        this.nodes = [
          ...res.ambos.map((b: string) => this.createBaseNode(b, 'OK', 'success')),
          ...res.somenteCloud.map((b: string) => this.createBaseNode(b, 'Somente Cloud', 'warning')),
          ...res.somenteLocal.map((b: string) => this.createBaseNode(b, 'Somente Local', 'danger')),
        ];

        this.loading = false;
        this.cd.detectChanges();
      },
      error: err => {
        console.error('Erro ao carregar bases', err);
        this.loading = false;
      }
    });
  }

  createBaseNode(nome: string, status: string, cor: string) {
    return {
      key: nome,
      data: { nome, status, cor },
      leaf: false,
      lazy: true,
      children: [],
    };
  }

  createSchemaNode(nome: string, status: string, cor: string) {
    return {
      key: nome,
      data: { nome, status, cor },
      leaf: true,
    };
  }

  onNodeExpand(event: any) {
    const node = event.node;

    if (node.children && node.children.length > 0 && !node.loading) {
      return;
    }

    node.loading = true;

    node.children = [
      {
        key: node.key + '-loading',
        data: { nome: 'Carregando...', status: '', cor: '', isLoadingMessage: true },
        leaf: true
      }
    ];
    this.nodes = [...this.nodes];

    this.baseService.findAll(`${this.endpoint}/comparativo/bases/${node.key}`).subscribe({
      next: (res: any) => {
        node.children = [
          ...res.ambos.map((s: string) => this.createSchemaNode(s, 'OK', 'success')),
          ...res.somenteCloud.map((s: string) => this.createSchemaNode(s, 'Somente Cloud', 'warning')),
          ...res.somenteLocal.map((s: string) => this.createSchemaNode(s, 'Somente Local', 'danger')),
        ];

        node.loading = false;

        this.nodes = [...this.nodes];
        this.cd.detectChanges();
      },
      error: err => {
        console.error('Erro ao carregar schemas', err);
        node.loading = false;
      }
    });
  }

  @ViewChild('op') op!: Popover;
  selectedRow: any;

  toggle(event: Event, row: any) {
    this.selectedRow = row;
    this.op.toggle(event);
  }

  abrirSincEstrutura(row: any) {
    let schema = row.node.key
    let banco = row.parent.key
    // let status = row.node.data.status;

    if (schema && banco) {
      this.router.navigate(['/client/estrutura'], {
        state: {
          base: banco,
          esquema: schema,
        }
      });
    }

    this.op.hide();

  }

  abrirSincDados(row: any) {
    let schema = row.node.key
    let banco = row.parent.key
    // let status = row.node.data.status;

    if (schema && banco) {
      this.router.navigate(['/client/dados'], {
        state: {
          base: banco,
          esquema: schema,
        }
      });
    }

    this.op.hide();

  }

}
