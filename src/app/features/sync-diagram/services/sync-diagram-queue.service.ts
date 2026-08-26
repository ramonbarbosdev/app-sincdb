import { Injectable, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import {
  formatQueueItemLabel,
  queueScopeKey,
  SyncDiagramContext,
  SyncDiagramMode,
  SyncQueueItem,
} from '../models/sync-diagram.model';

@Injectable()
export class SyncDiagramQueueService {
  readonly items = signal<SyncQueueItem[]>([]);

  constructor(private messageService: MessageService) {}

  count(): number {
    return this.items().length;
  }

  hasScope(context: SyncDiagramContext, mode: SyncDiagramMode): boolean {
    const key = queueScopeKey(context, mode);
    return this.items().some((item) => queueScopeKey(item.context, item.mode) === key);
  }

  enqueue(
    context: SyncDiagramContext,
    mode: SyncDiagramMode,
    options?: { silent?: boolean }
  ): boolean {
    const base = context.base;
    const esquema = context.esquema;
    if (!base || !esquema) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Seleção incompleta',
        detail: 'Selecione base e schema no diagrama.',
      });
      return false;
    }

    const key = queueScopeKey(context, mode);
    if (this.items().some((item) => queueScopeKey(item.context, item.mode) === key)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Já na fila',
        detail: `${formatQueueItemLabel(context)} já está na fila de sincronização.`,
      });
      return false;
    }

    const item: SyncQueueItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      mode,
      context: { ...context },
      label: formatQueueItemLabel(context),
      createdAt: Date.now(),
    };

    this.items.update((list) => [...list, item]);

    if (!options?.silent) {
      this.messageService.add({
        severity: 'info',
        summary: 'Adicionado à fila',
        detail: `${item.label} · ${mode}`,
      });
    }

    return true;
  }

  dequeue(): SyncQueueItem | undefined {
    const list = this.items();
    if (!list.length) return undefined;
    const [first, ...rest] = list;
    this.items.set(rest);
    return first;
  }

  remove(id: string): void {
    this.items.update((list) => list.filter((item) => item.id !== id));
  }

  clear(): void {
    this.items.set([]);
  }
}
