import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { LayoutCampo } from '../../../../components/layout-campo/layout-campo';
import { SelectModule } from 'primeng/select';
import { Estruturas } from '../../../../models/estruturas';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseService } from '../../../../services/base.service';
import { FlagOption } from '../../../../models/flag-option';

@Component({
  selector: 'app-estruturaform',
  imports: [CardModule, LayoutCampo, SelectModule, CommonModule, FormsModule],
  templateUrl: './estruturaform.html',
  styleUrl: './estruturaform.scss',
})
export class Estruturaform {
  public objeto: Estruturas = new Estruturas();
  private baseService = inject(BaseService);

  public listaBase: FlagOption[] = [];
  public listaEsquema: FlagOption[] = [];
  public listaTabela: FlagOption[] = [];

  private cd = inject(ChangeDetectorRef);

  loadingBase = true;
  loadingEsquema = false;
  loadingTabela = false;

  ngOnInit() {
    this.obterBase();
  }

  processarBase(item: any) {
    if (!item) return;

    this.obterEsquema(item);
  }

  processarEsquema(item: any) {
    if (!item) return;

    this.obterTabela(item);
  }

  obterBase() {
    this.baseService.findAll(`sincronizacao/bases/`).subscribe({
      next: (res) => {
        this.listaBase = (res as any).map((index: any) => {
          const item = new FlagOption();
          item.code = index;
          item.name = index;
          this.cd.markForCheck();
          return item;
        });

        this.loadingBase = false;
      },
      error: (err) => {
        this.loadingBase = false;
      },
    });
  }

  obterEsquema(item: any) {
    this.loadingEsquema = true;

    this.baseService.findAll(`sincronizacao/base/esquema/${item}`).subscribe({
      next: (res) => {
        this.listaEsquema = (res as any).map((index: any) => {
          const item = new FlagOption();
          item.code = index;
          item.name = index;
          this.cd.markForCheck();
          return item;
        });

        if (this.listaEsquema?.length) {
          this.objeto.esquema = String(this.listaEsquema[this.listaEsquema.length - 1].code);
        }

        this.loadingEsquema = false;
      },
      error: (err) => {
        this.loadingEsquema = false;
      },
    });
  }

  obterTabela(item: any) {
    this.loadingTabela = true;

    let base = this.objeto.base;
    let esquema = item;

    if (base && item)
      this.baseService.findAll(`sincronizacao/base/tabela/${base}/${esquema}`).subscribe({
        next: (res) => {
          this.listaTabela = (res as any).map((index: any) => {
            const item = new FlagOption();
            item.code = index;
            item.name = index;
            this.cd.markForCheck();
            return item;
          });

          this.loadingTabela = false;
        },
        error: (err) => {
          this.loadingTabela = false;
        },
      });
  }
}
