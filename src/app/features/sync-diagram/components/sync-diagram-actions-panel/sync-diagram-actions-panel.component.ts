import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SyncDiagramMode } from '../../models/sync-diagram.model';

@Component({
  selector: 'app-sync-diagram-actions-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sync-diagram-actions-panel.component.html',
  styleUrls: ['../../sync-diagram.theme.scss', './sync-diagram-actions-panel.component.scss'],
})
export class SyncDiagramActionsPanelComponent {
  @Input() mode: SyncDiagramMode = 'estrutura';
  @Input() scopeLabel = '—';
  @Input() hasSelection = false;
  @Input() running = false;
  @Input() canRecolher = false;

  @Output() verifyEstrutura = new EventEmitter<void>();
  @Output() syncEstrutura = new EventEmitter<void>();
  @Output() verifyDados = new EventEmitter<void>();
  @Output() syncDados = new EventEmitter<void>();
  @Output() recolher = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();

  isEstrutura(): boolean {
    return this.mode === 'estrutura';
  }

  isDados(): boolean {
    return this.mode === 'dados';
  }
}
