import { FFlowModule } from '@foblex/flow';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { OperationPhase, SyncOperation } from '../../models/sync-diagram.model';

@Component({
  selector: 'app-sync-operation-node-card',
  standalone: true,
  imports: [CommonModule, FFlowModule],
  templateUrl: './sync-operation-node-card.component.html',
  styleUrls: ['../../sync-diagram.theme.scss', './sync-operation-node-card.component.scss'],
})
export class SyncOperationNodeCardComponent {
  @Input({ required: true }) operation!: SyncOperation;

  @Output() toggleDetail = new EventEmitter<void>();
  @Output() closeDetail = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  phaseLabel(phase: OperationPhase): string {
    const map: Record<OperationPhase, string> = {
      verificando: 'Verificando',
      verificado: 'Verificado',
      sincronizando: 'Sincronizando',
      concluido: 'Concluído',
      erro: 'Erro',
      cancelado: 'Cancelado',
    };
    return map[phase];
  }

  isRunning(): boolean {
    return this.operation.phase === 'verificando' || this.operation.phase === 'sincronizando';
  }

  onCardClick(): void {
    this.toggleDetail.emit();
  }

  onCloseDetail(event: Event): void {
    event.stopPropagation();
    this.closeDetail.emit();
  }

  onCancel(event: Event): void {
    event.stopPropagation();
    this.cancel.emit();
  }
}
