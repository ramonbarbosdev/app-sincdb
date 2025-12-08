import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EventService {
  private reloadAnexoSubject = new Subject<void>();
  itemAnexoReload$ = this.reloadAnexoSubject.asObservable();

  emitItemAnexoReload() {
    this.reloadAnexoSubject.next();
  }

  private fecharForm = new Subject<void>();
  fecharForm$ = this.fecharForm.asObservable();

  notifyFechar() {
    this.fecharForm.next();
  }

  private reloadKanban = new Subject<void>();
  reloadKanban$ = this.reloadKanban.asObservable();

  emitReloadKanban() {
    this.reloadKanban.next();
  }

  private reloadCalculoComissaoProjetistaAdministrativo = new Subject<void>();
  reloadCalculoComissaoProjetistaAdministrativo$ =
    this.reloadCalculoComissaoProjetistaAdministrativo.asObservable();

  emitReloadCalculoComissaoProjetistaAdministrativo() {
    this.reloadCalculoComissaoProjetistaAdministrativo.next();
  }

  private reloadCalculoPagamento2Parcela = new Subject<void>();
  reloadCalculoPagamento2Parcela$ =
    this.reloadCalculoPagamento2Parcela.asObservable();

  emitreloadCalculoPagamento2Parcela() {
    this.reloadCalculoPagamento2Parcela.next();
  }
}
