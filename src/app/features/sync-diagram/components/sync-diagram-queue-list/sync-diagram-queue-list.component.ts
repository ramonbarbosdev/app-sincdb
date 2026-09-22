import { CommonModule } from '@angular/common';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { SyncDiagramMode, SyncQueueItem } from '../../models/sync-diagram.model';
import { SyncDiagramQueueService } from '../../services/sync-diagram-queue.service';

@Component({
  selector: 'app-sync-diagram-queue-list',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './sync-diagram-queue-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncDiagramQueueListComponent {
  readonly queue = inject(SyncDiagramQueueService);

  @Input() running = false;
  @Input() canRunQueue = false;

  @Output() removeItem = new EventEmitter<string>();
  @Output() clearQueue = new EventEmitter<void>();
  @Output() runQueue = new EventEmitter<void>();
  @Output() reorderItems = new EventEmitter<string[]>();

  modeLabel(mode: SyncDiagramMode): string {
    return mode;
  }

  /** Prefixo até o último ponto (apagado) + sufixo final (destaque). */
  labelParts(label: string): { prefix: string; suffix: string } {
    const lastDot = label.lastIndexOf('.');
    if (lastDot > 0 && lastDot < label.length - 1) {
      return { prefix: label.slice(0, lastDot + 1), suffix: label.slice(lastDot + 1) };
    }
    return { prefix: '', suffix: label };
  }

  onQueueDrop(event: CdkDragDrop<SyncQueueItem[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const items = [...this.queue.pendingItems()];
    moveItemInArray(items, event.previousIndex, event.currentIndex);
    this.reorderItems.emit(items.map((entry) => entry.id));
  }
}
