import { FFlowModule } from '@foblex/flow';
import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import {
  SyncDiagramAction,
  SyncDiagramItem,
  SyncDiagramKind,
  SyncDiagramNodeData,
} from '../../models/sync-diagram.model';

const FILTER_DEBOUNCE_MS = 1000;

@Component({
  selector: 'app-sync-diagram-node-card',
  standalone: true,
  imports: [CommonModule, FormsModule, FFlowModule],
  templateUrl: './sync-diagram-node-card.component.html',
  styleUrls: ['../../sync-diagram.theme.scss', './sync-diagram-node-card.component.scss'],
})
export class SyncDiagramNodeCardComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) node!: SyncDiagramNodeData;
  @Input() items: SyncDiagramItem[] = [];

  @Output() filterChange = new EventEmitter<string>();
  @Output() itemClick = new EventEmitter<string>();
  @Output() itemOpen = new EventEmitter<string>();
  @Output() action = new EventEmitter<SyncDiagramAction>();

  filterText = '';
  private readonly filterInput$ = new Subject<string>();
  private readonly filterSub: Subscription;

  constructor() {
    this.filterSub = this.filterInput$
      .pipe(debounceTime(FILTER_DEBOUNCE_MS), distinctUntilChanged())
      .subscribe((value) => this.filterChange.emit(value));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['node']) {
      const prevId = changes['node'].previousValue?.id;
      const nextId = changes['node'].currentValue?.id;
      if (!prevId || prevId !== nextId) {
        this.filterText = this.node.filter ?? '';
      }
    }
  }

  ngOnDestroy(): void {
    this.filterSub.unsubscribe();
    this.filterInput$.complete();
  }

  onFilterInput(value: string): void {
    this.filterText = value;
    this.filterInput$.next(value);
  }

  iconLabel(kind: SyncDiagramKind): string {
    const map: Record<SyncDiagramKind, string> = {
      bases: 'B',
      schemas: 'S',
      schema: 'S',
      tables: 'T',
    };
    return map[kind];
  }

  canShowClose(): boolean {
    if (this.node.kind === 'bases') {
      return !!this.node.selectedItemId;
    }
    return this.node.kind === 'schemas' || this.node.kind === 'tables' || this.node.kind === 'schema';
  }

  closeButtonTitle(): string {
    if (this.node.kind === 'schemas' && this.node.openedItemId) {
      return 'Fechar tabelas';
    }
    if (this.node.kind === 'schema' && this.node.openedItemId) {
      return 'Fechar tabelas';
    }
    if (this.node.kind === 'tables') {
      return 'Fechar tabelas';
    }
    if (this.node.kind === 'schemas') {
      return 'Fechar lista de schemas';
    }
    if (this.node.kind === 'schema') {
      return 'Fechar schema';
    }
    return 'Fechar filhos';
  }

  hasActivePath(): boolean {
    if (this.node.kind === 'schema') {
      return !!this.node.openedItemId || !!this.node.context.esquema;
    }
    if (this.node.kind === 'tables') {
      return (this.node.selectedItemIds?.length ?? 0) > 0;
    }
    return !!this.node.selectedItemId;
  }

  isTableSelected(itemId: string): boolean {
    return this.node.selectedItemIds?.includes(itemId) ?? false;
  }
}
