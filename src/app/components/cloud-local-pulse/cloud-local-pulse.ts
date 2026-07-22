import { CommonModule } from '@angular/common';
import { Component, Input, inject, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ProgressoSyncService } from '../../services/progresso-sync-service';

@Component({
  selector: 'app-cloud-local-pulse',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cloud-local-pulse.html',
  styleUrl: './cloud-local-pulse.scss',
})
export class CloudLocalPulse implements OnInit, OnDestroy {
  /** Força estado de sync; se omitido, escuta ProgressoSyncService */
  @Input() syncing?: boolean;
  @Input() compact = false;

  private progressoSync = inject(ProgressoSyncService);
  private sub?: Subscription;
  private syncingInterno = false;

  get isSyncing(): boolean {
    return this.syncing ?? this.syncingInterno;
  }

  ngOnInit() {
    if (this.syncing === undefined) {
      this.sub = this.progressoSync.progressoState$.subscribe((state) => {
        this.syncingInterno = state.status === 'RUNNING';
      });
    }
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
