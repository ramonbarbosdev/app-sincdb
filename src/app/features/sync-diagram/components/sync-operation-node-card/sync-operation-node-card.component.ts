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
import {
  countOperationLogErrors,
  formatOperationScopeSubtitle,
  groupOperationLogs,
  isLikelyErrorMessage,
  OperationLogGroup,
  OperationLogLevel,
  OperationPhase,
  SyncDiagramContext,
  SyncDiagramMode,
  SyncOperation,
  TabelaAfetadaDTO,
} from '../../models/sync-diagram.model';
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
  @Output() close = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() retry = new EventEmitter<void>();
  @Output() toggleErrors = new EventEmitter<void>();

  private state = inject(SyncDiagramStateService);

  readonly operation = computed(() => {
    this.state.operations();
    return this.state.getOperation(this.operationId);
  });

  displayTitle(phase: OperationPhase): string {
    const map: Record<OperationPhase, string> = {
      verificando: 'Verificando',
      verificado: 'Sincronizando',
      sincronizando: 'Sincronizando',
      concluido: 'Concluído',
      erro: 'Erro',
      cancelado: 'Cancelado',
    };
    return map[phase];
  }

  showsModeLabel(phase: OperationPhase): boolean {
    return phase === 'verificando' || phase === 'verificado' || phase === 'sincronizando';
  }

  scopeSubtitle(context: SyncDiagramContext): string {
    return formatOperationScopeSubtitle(context);
  }

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

  hasDetailContent(operation: SyncOperation): boolean {
    return (
      this.isRunning() ||
      (operation.terminalLogs?.length ?? 0) > 0 ||
      (operation.errors?.length ?? 0) > 0 ||
      this.tableErrors(operation).length > 0
    );
  }

  errorCount(operation: SyncOperation): number {
    return countOperationLogErrors(
      operation.terminalLogs ?? [],
      operation.errors,
      operation.tabelasAfetadas
    );
  }

  logGroups(operation: SyncOperation): OperationLogGroup[] {
    return groupOperationLogs(operation.terminalLogs ?? []);
  }

  tableErrors(operation: SyncOperation): TabelaAfetadaDTO[] {
    const loggedTables = new Set(
      (operation.terminalLogs ?? [])
        .filter((e) => e.level === 'table')
        .map((e) => e.table ?? e.message)
    );
    return (operation.tabelasAfetadas ?? []).filter(
      (row) => row.erro && row.tabela && !loggedTables.has(row.tabela)
    );
  }

  readonly isLikelyErrorMessage = isLikelyErrorMessage;

  modeIcon(mode: SyncDiagramMode): string {
    return mode === 'estrutura' ? 'pi-sitemap' : 'pi-database';
  }

  modeLabel(mode: SyncDiagramMode): string {
    return mode === 'estrutura' ? 'Estrutura' : 'Dados';
  }

  phaseIcon(phase: OperationPhase): string {
    const map: Record<OperationPhase, string> = {
      verificando: 'pi-search',
      verificado: 'pi-check',
      sincronizando: 'pi-sync',
      concluido: 'pi-check-circle',
      erro: 'pi-exclamation-circle',
      cancelado: 'pi-ban',
    };
    return map[phase];
  }

  logIcon(level: OperationLogLevel): string {
    const map: Record<OperationLogLevel, string> = {
      table: 'pi-table',
      error: 'pi-times-circle',
      warn: 'pi-exclamation-triangle',
      info: 'pi-info-circle',
      ok: 'pi-check',
      skip: 'pi-forward',
      done: 'pi-check-circle',
      text: '',
    };
    return map[level];
  }

  onToggleDetail(event: Event): void {
    event.stopPropagation();
    this.toggleDetail.emit();
  }

  onOpenDetail(event: Event): void {
    event.stopPropagation();
    const op = this.operation();
    if (op && !op.detailOpen) {
      this.toggleDetail.emit();
    }
  }

  onClose(event: Event): void {
    event.stopPropagation();
    this.close.emit();
  }

  onCancel(event: Event): void {
    event.stopPropagation();
    this.cancel.emit();
  }

  onRetry(event: Event): void {
    event.stopPropagation();
    this.retry.emit();
  }
}
