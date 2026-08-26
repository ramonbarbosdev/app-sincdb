import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { SyncDiagramMode } from '../../models/sync-diagram.model';
import { SyncDiagramQueueService } from '../../services/sync-diagram-queue.service';

@Component({
  selector: 'app-sync-diagram-queue-list',
  standalone: true,
  imports: [CommonModule],
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

  modeLabel(mode: SyncDiagramMode): string {
    return mode;
  }
}
