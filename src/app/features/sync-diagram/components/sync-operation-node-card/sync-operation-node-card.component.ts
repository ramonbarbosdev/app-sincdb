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
  signal,
} from '@angular/core';
import { MessageService } from 'primeng/api';
import {
  countOperationLogErrors,
  formatOperationScopeSubtitle,
  formatTabelaAfetadaError,
  groupOperationLogs,
  isLikelyErrorMessage,
  resolveOperationErrorSummary,
  listVisibleOperationErrors,
  SyncErrorSummary,
  OperationLogGroup,
  OperationLogLevel,
  OperationPhase,
  SyncDiagramContext,
  SyncDiagramMode,
  SyncOperation,
  TabelaAfetadaDTO,
} from '../../models/sync-diagram.model';
import { SyncDiagramStateService } from '../../services/sync-diagram-state.service';
import { copyTextToClipboard } from '../../../../utils/copy-to-clipboard';
import { humanizeBackendMessage } from '../../../../utils/api-error-message';

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
  private messageService = inject(MessageService);

  readonly copyFeedback = signal(false);

  readonly operation = computed(() => {
    this.state.operations();
    return this.state.getOperation(this.operationId);
  });

  readonly errorSummary = computed((): SyncErrorSummary => {
    const op = this.operation();
    if (!op) {
      return { headline: 'A operação falhou. Tente novamente.' };
    }
    return resolveOperationErrorSummary(op);
  });

  displayTitle(phase: OperationPhase): string {
    const map: Record<OperationPhase, string> = {
      aguardando: 'Na fila',
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
      aguardando: 'Na fila',
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
    if (!op) return false;
    return this.state.isOperationActive(op);
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
    const summary = this.errorSummary();
    return summary.title ?? summary.headline;
  }

  primaryErrorDetail(): string {
    const summary = this.errorSummary();
    return summary.title ? summary.headline : '';
  }

  detailErrors(operation: SyncOperation): string[] {
    return listVisibleOperationErrors(operation, this.errorSummary().headline);
  }

  hasDetailContent(operation: SyncOperation): boolean {
    return (
      (operation.terminalLogs?.length ?? 0) > 0 ||
      (operation.errors?.length ?? 0) > 0 ||
      this.tableErrors(operation).length > 0
    );
  }

  showRegistroButton(operation: SyncOperation): boolean {
    return this.isRunning() || this.hasDetailContent(operation);
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
    return (operation.tabelasAfetadas ?? []).filter((row) => row.erro);
  }

  tableErrorMessage(row: TabelaAfetadaDTO): string {
    return humanizeBackendMessage(formatTabelaAfetadaError(row));
  }

  humanizeErrorLine(message: string): string {
    return humanizeBackendMessage(message);
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
      aguardando: 'pi-clock',
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

  async onCopyError(event: Event): Promise<void> {
    event.stopPropagation();
    const op = this.operation();
    if (!op) {
      return;
    }
    const text = this.buildCopyableErrorText(op);
    const copied = await copyTextToClipboard(text);
    if (copied) {
      this.copyFeedback.set(true);
      window.setTimeout(() => this.copyFeedback.set(false), 2000);
      this.messageService.add({
        severity: 'success',
        summary: 'Copiado',
        detail: 'Mensagem de erro copiada para a área de transferência.',
        life: 2000,
      });
      return;
    }
    this.messageService.add({
      severity: 'warn',
      summary: 'Não foi possível copiar',
      detail: 'Selecione o texto do erro e use Ctrl+C (ou Cmd+C).',
      life: 3000,
    });
  }

  copyErrorTitle(): string {
    return this.copyFeedback() ? 'Copiado' : 'Copiar erro';
  }

  private buildCopyableErrorText(operation: SyncOperation): string {
    const lines: string[] = [];
    const scope = formatOperationScopeSubtitle(operation.context);
    if (scope) {
      lines.push(`Escopo: ${scope}`);
    }

    const summary = resolveOperationErrorSummary(operation);
    if (summary.title) {
      lines.push(summary.title);
    }
    if (summary.headline) {
      lines.push(summary.headline);
    }
    if (summary.technical && summary.technical !== summary.headline) {
      lines.push(`Detalhe técnico: ${summary.technical}`);
    }

    for (const err of this.detailErrors(operation)) {
      if (err?.trim() && !lines.includes(err)) {
        lines.push(err);
      }
    }

    for (const row of this.tableErrors(operation)) {
      const msg = formatTabelaAfetadaError(row);
      const line = row.tabela ? `${row.tabela}: ${msg}` : msg;
      if (line && !lines.includes(line)) {
        lines.push(line);
      }
    }

    for (const entry of operation.terminalLogs ?? []) {
      if (entry.level !== 'error' && !isLikelyErrorMessage(entry.message)) {
        continue;
      }
      const msg = entry.message?.trim();
      if (msg && !lines.includes(msg)) {
        lines.push(msg);
      }
    }

    return lines.join('\n');
  }
}
