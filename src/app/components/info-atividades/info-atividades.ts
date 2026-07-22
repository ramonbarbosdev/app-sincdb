import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, inject, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { BaseService } from '../../services/base.service';
import { getStatusSincronizadoMap } from '../../map/statusSincronizacao.map';
import { getOperacaoMap } from '../../map/operacao.map';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
@Component({
  selector: 'app-info-atividades',
  imports: [TableModule, CommonModule, FormsModule, IconFieldModule, InputIconModule, ButtonModule, InputTextModule, SkeletonModule],
  templateUrl: './info-atividades.html',
  styleUrl: './info-atividades.scss',
})
export class InfoAtividades {

  private baseService = inject(BaseService);
  private cd = inject(ChangeDetectorRef);

  endpoint = 'info';
  loading: boolean = true;
  value: any[] = [];
  private skeletonRows = [{}, {}, {}, {}, {}];

  get displayValue(): any[] {
    return this.loading ? this.skeletonRows : this.value;
  }

  @ViewChild('filter') filter!: ElementRef;
  @ViewChild('dt') tabela!: Table;

  onGlobalFilter(table: any, event: any) {
    table.filterGlobal(event.target.value, 'contains');
  }

  onClearFilters(table: Table) {
    table.clear();
    if (this.filter) {
      this.filter.nativeElement.value = '';
    }
  }

  ngOnInit() {
    this.onShow()
  }

  onShow() {

    this.loading = true;

    this.baseService.findAll(`${this.endpoint}/atividade`).subscribe({
      next: (res: any) => {
        this.value = res.map((item: any) => ({
          ...item,
          status: getStatusSincronizadoMap(item.status),
          operacao: getOperacaoMap(item.operacao),
        }));
        this.cd.detectChanges();

        this.loading = false;

      },
      error: (err) => {
        console.error('Erro ao carregar dados:', err);
        this.loading = false;
      },
    });
  }
}
