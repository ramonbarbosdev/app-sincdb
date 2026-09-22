import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Observable, map, tap, catchError, throwError, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  formatQueueItemLabel,
  queueScopeKey,
  SyncDiagramContext,
  SyncDiagramMode,
  SyncQueueItem,
  SyncQueueItemStatus,
} from '../models/sync-diagram.model';

interface BackendSyncQueueItem {
  id: string;
  operacao: 'ESTRUTURA' | 'DADOS';
  baseNome: string;
  schemaNome: string;
  tabela?: string;
  tabelas?: string[];
  label: string;
  status: SyncQueueItemStatus;
  errorMessage?: string;
  createdAt?: string;
}

interface BackendSyncQueueStatus {
  running: boolean;
  pendingCount: number;
  currentItemId?: string | null;
}

@Injectable()
export class SyncDiagramQueueService {
  readonly items = signal<SyncQueueItem[]>([]);
  readonly runnerActive = signal(false);

  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly messageService = inject(MessageService);

  count(): number {
    return this.pendingItems().length;
  }

  pendingItems(): SyncQueueItem[] {
    return this.items().filter((item) => item.status === 'PENDING' || !item.status);
  }

  /** Escopos ainda na fila ou em execução no servidor (alinha com ACTIVE_STATUSES da API). */
  hasScope(context: SyncDiagramContext, mode: SyncDiagramMode): boolean {
    const key = queueScopeKey(context, mode);
    return this.items().some(
      (item) => this.isActiveQueueItem(item) && queueScopeKey(item.context, item.mode) === key
    );
  }

  private isActiveQueueItem(item: SyncQueueItem): boolean {
    return item.status === 'PENDING' || item.status === 'RUNNING' || !item.status;
  }

  private hasActiveServerWork(items: SyncQueueItem[], status: BackendSyncQueueStatus): boolean {
    if (status.running) return true;
    if (status.pendingCount > 0) return true;
    return items.some((item) => item.status === 'PENDING' || item.status === 'RUNNING');
  }

  refresh(): Observable<SyncQueueItem[]> {
    return this.http.get<BackendSyncQueueItem[]>(`${this.apiUrl}/sync-queue`).pipe(
      map((rows) => rows.map((row) => this.mapBackendItem(row))),
      tap((items) => this.items.set(items)),
      catchError((error) => {
        console.error(error);
        return throwError(() => error);
      })
    );
  }

  refreshStatus(): Observable<BackendSyncQueueStatus> {
    return this.http
      .get<BackendSyncQueueStatus>(`${this.apiUrl}/sync-queue/status`)
      .pipe(tap((status) => this.runnerActive.set(status.running)));
  }

  enqueue(
    context: SyncDiagramContext,
    mode: SyncDiagramMode,
    options?: { silent?: boolean }
  ): Observable<SyncQueueItem | null> {
    const base = context.base;
    const esquema = context.esquema;
    if (!base || !esquema) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Seleção incompleta',
        detail: 'Selecione base e schema no diagrama.',
      });
      return new Observable((subscriber) => {
        subscriber.next(null);
        subscriber.complete();
      });
    }

    const body = {
      operacao: mode === 'estrutura' ? 'ESTRUTURA' : 'DADOS',
      base,
      esquema,
      tabela: context.tabela,
      tabelas: context.tabelas ?? [],
      label: formatQueueItemLabel(context),
    };

    return this.http.post<BackendSyncQueueItem>(`${this.apiUrl}/sync-queue`, body).pipe(
      map((row) => this.mapBackendItem(row)),
      tap((item) => {
        this.items.update((list) => {
          const without = list.filter((entry) => entry.id !== item.id);
          return [...without, item];
        });
        if (!options?.silent) {
          this.messageService.add({
            severity: 'info',
            summary: 'Adicionado à fila',
            detail: `${item.label} · ${mode}`,
          });
        }
      }),
      catchError((error) => {
        if (error?.status === 409) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Já na fila',
            detail: `${formatQueueItemLabel(context)} já está na fila de sincronização.`,
          });
          this.refresh().subscribe();
          return of(null);
        }
        console.error(error);
        return throwError(() => error);
      })
    );
  }

  startRunner(): Observable<boolean> {
    return this.http.post<{ started: boolean }>(`${this.apiUrl}/sync-queue/run`, {}).pipe(
      tap((res) => this.runnerActive.set(!!res.started)),
      map((res) => !!res.started)
    );
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/sync-queue/${id}`).pipe(
      tap(() => this.items.update((list) => list.filter((item) => item.id !== id)))
    );
  }

  clear(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/sync-queue`).pipe(tap(() => this.items.set([])));
  }

  reorderPending(orderedIds: string[]): Observable<SyncQueueItem[]> {
    this.applyPendingOrder(orderedIds);
    return this.http
      .put<BackendSyncQueueItem[]>(`${this.apiUrl}/sync-queue/reorder`, { orderedIds })
      .pipe(
        map((rows) => rows.map((row) => this.mapBackendItem(row))),
        tap((items) => this.items.set(items)),
        catchError((error) => {
          console.error(error);
          this.messageService.add({
            severity: 'error',
            summary: 'Não foi possível reordenar',
            detail: 'Atualize a fila e tente novamente.',
          });
          this.refresh().subscribe();
          return throwError(() => error);
        })
      );
  }

  movePendingItem(id: string, delta: -1 | 1): Observable<SyncQueueItem[] | null> {
    const pending = this.pendingItems();
    const index = pending.findIndex((item) => item.id === id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= pending.length) {
      return of(null);
    }
    const reordered = [...pending];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    return this.reorderPending(reordered.map((item) => item.id));
  }

  applyPendingOrder(orderedIds: string[]): void {
    if (!orderedIds.length) return;
    const pendingSet = new Set(orderedIds);
    this.items.update((list) => {
      const byId = new Map(list.map((item) => [item.id, item]));
      const reordered = orderedIds
        .map((id) => byId.get(id))
        .filter((item): item is SyncQueueItem => !!item);
      const rest = list.filter((item) => !pendingSet.has(item.id));
      return [...reordered, ...rest];
    });
  }

  pollUntilIdle(): Observable<{ items: SyncQueueItem[]; currentItemId?: string | null }> {
    return new Observable((subscriber) => {
      const tick = () => {
        this.refreshStatus().subscribe({
          next: (status) => {
            this.refresh().subscribe({
              next: (items) => {
                subscriber.next({ items, currentItemId: status.currentItemId });
                if (!this.hasActiveServerWork(items, status)) {
                  this.runnerActive.set(false);
                  subscriber.complete();
                } else {
                  setTimeout(tick, 1200);
                }
              },
              error: (error) => subscriber.error(error),
            });
          },
          error: (error) => subscriber.error(error),
        });
      };
      tick();
    });
  }

  private mapBackendItem(row: BackendSyncQueueItem): SyncQueueItem {
    const mode: SyncDiagramMode = row.operacao === 'ESTRUTURA' ? 'estrutura' : 'dados';
    const context: SyncDiagramContext = {
      base: row.baseNome,
      esquema: row.schemaNome,
      tabela: row.tabela,
      tabelas: row.tabelas?.length ? [...row.tabelas] : undefined,
    };

    return {
      id: row.id,
      mode,
      context,
      label: row.label,
      createdAt: row.createdAt ? this.parseBackendDate(row.createdAt) : Date.now(),
      status: row.status,
      errorMessage: row.errorMessage,
    };
  }

  private parseBackendDate(value: string): number {
    const iso = Date.parse(value);
    if (!Number.isNaN(iso)) return iso;
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
    if (!match) return Date.now();
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    const second = Number(match[6]);
    return new Date(year, month - 1, day, hour, minute, second).getTime();
  }
}
