import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { SyncDiagramMode } from '../../models/sync-diagram.model';
import { SyncDiagramThemeService } from '../../services/sync-diagram-theme.service';

@Component({
  selector: 'app-sync-diagram-actions-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sync-diagram-actions-panel.component.html',
  styleUrls: ['../../sync-diagram.theme.scss', './sync-diagram-actions-panel.component.scss'],
})
export class SyncDiagramActionsPanelComponent {
  readonly themeService = inject(SyncDiagramThemeService);

  @Input() mode: SyncDiagramMode = 'estrutura';
  @Input() scopeLabel = '—';
  @Input() hasSelection = false;
  @Input() running = false;
  @Input() canRecolher = false;

  @Output() modeChange = new EventEmitter<SyncDiagramMode>();
  @Output() sincronizarSelecao = new EventEmitter<void>();
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

  selectMode(mode: SyncDiagramMode): void {
    if (this.mode !== mode) {
      this.modeChange.emit(mode);
    }
  }

  verifyTitle(): string {
    return this.isEstrutura() ? 'Verificar estrutura' : 'Verificar dados';
  }

  syncTitle(): string {
    return this.isEstrutura() ? 'Sincronizar estrutura' : 'Sincronizar dados';
  }

  verifyAriaLabel(): string {
    return `${this.verifyTitle()} · ${this.scopeLabel}`;
  }

  syncAriaLabel(): string {
    return `${this.syncTitle()} · ${this.scopeLabel}`;
  }

  emitVerify(): void {
    if (this.isEstrutura()) {
      this.verifyEstrutura.emit();
    } else {
      this.verifyDados.emit();
    }
  }

  emitSync(): void {
    if (this.isEstrutura()) {
      this.syncEstrutura.emit();
    } else {
      this.syncDados.emit();
    }
  }
}
