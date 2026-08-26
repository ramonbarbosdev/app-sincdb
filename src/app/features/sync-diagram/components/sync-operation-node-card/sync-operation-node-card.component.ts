import { FFlowModule } from '@foblex/flow';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  Output,
} from '@angular/core';
import { OperationPhase } from '../../models/sync-diagram.model';
import { SyncDiagramStateService } from '../../services/sync-diagram-state.service';

@Component({
  selector: 'app-sync-operation-node-card',
  standalone: true,
  imports: [CommonModule, FFlowModule],
  templateUrl: './sync-operation-node-card.component.html',
  styleUrls: ['../../sync-diagram.theme.scss', './sync-operation-node-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncOperationNodeCardComponent {
  @Input({ required: true }) operationId!: string;

  @Output() toggleDetail = new EventEmitter<void>();
  @Output() closeDetail = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() retry = new EventEmitter<void>();
  @Output() toggleErrors = new EventEmitter<void>();

  private state = inject(SyncDiagramStateService);

  readonly operation = computed(() => {
    this.state.operations();
    return this.state.getOperation(this.operationId);
  });

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
    const op = this.operation();
    return op?.phase === 'verificando' || op?.phase === 'sincronizando';
  }

  showProgress(): boolean {
    const op = this.operation();
    if (!op) return false;
    return (
      this.isRunning() ||
      op.phase === 'concluido' ||
      op.phase === 'verificado'
    );
  }

  progressWidth(): number {
    const op = this.operation();
    if (!op) return 0;
    if (op.phase === 'concluido' || op.phase === 'verificado') {
      return 100;
    }
    return op.progress;
  }

  progressLabel(): string {
    const op = this.operation();
    if (!op) return '0%';
    if (op.phase === 'concluido' || op.phase === 'verificado') {
      return '100%';
    }
    return `${op.progress}%`;
  }

  primaryError(): string {
    const op = this.operation();
    return op?.errors?.[0] ?? 'A operação falhou. Tente novamente.';
  }

  showErrorDetailsButton(): boolean {
    const op = this.operation();
    return (op?.errors?.length ?? 0) > 0;
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

  onRetry(event: Event): void {
    event.stopPropagation();
    this.retry.emit();
  }

  onToggleErrors(event: Event): void {
    event.stopPropagation();
    this.toggleErrors.emit();
  }
}
