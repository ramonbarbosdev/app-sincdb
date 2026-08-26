import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { SyncDiagramMode } from '../../models/sync-diagram.model';

@Component({
  selector: 'app-sync-diagram-actions-panel',
  standalone: true,
  imports: [CommonModule, TooltipModule],
  templateUrl: './sync-diagram-actions-panel.component.html',
  styleUrls: ['../../sync-diagram.theme.scss', './sync-diagram-actions-panel.component.scss'],
})
export class SyncDiagramActionsPanelComponent {
  @Input() mode: SyncDiagramMode = 'estrutura';
  @Input() scopeLabel = '—';
  @Input() hasSelection = false;
  @Input() running = false;
  @Input() canRecolher = false;

  @Output() modeChange = new EventEmitter<SyncDiagramMode>();
  @Output() sincronizarSelecao = new EventEmitter<void>();
  @Output() recolher = new EventEmitter<void>();
  @Output() autoLayout = new EventEmitter<void>();

  isEstrutura(): boolean {
    return this.mode === 'estrutura';
  }

  isDados(): boolean {
    return this.mode === 'dados';
  }

  selectMode(mode: SyncDiagramMode): void {
    if (this.mode !== mode) {
      this.modeChange.emit(mode);
    }
  }
}
