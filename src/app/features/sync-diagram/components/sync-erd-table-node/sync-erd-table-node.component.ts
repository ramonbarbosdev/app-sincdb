import { FFlowModule } from '@foblex/flow';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, Input } from '@angular/core';
import { ErdTableNode, TableVisualStatus } from '../../models/sync-diagram.model';
import { SyncDiagramStateService } from '../../services/sync-diagram-state.service';

@Component({
  selector: 'app-sync-erd-table-node',
  standalone: true,
  imports: [CommonModule, FFlowModule],
  templateUrl: './sync-erd-table-node.component.html',
  styleUrls: ['../../sync-diagram.theme.scss', './sync-erd-table-node.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncErdTableNodeComponent {
  @Input({ required: true }) tableId!: string;

  private state = inject(SyncDiagramStateService);

  readonly table = computed(() => this.state.getErdTable(this.tableId));

  displayName(table: ErdTableNode): string {
    const nome = table.nome;
    if (nome.includes('.')) return nome.split('.').pop() ?? nome;
    return nome;
  }

  statusBadge(status: TableVisualStatus): string | null {
    const map: Partial<Record<TableVisualStatus, string>> = {
      created: '+',
      altered: 'Δ',
      linked: '→',
      syncing: '◎',
      running: '◎',
      done: '✓',
      error: '!',
    };
    return map[status] ?? null;
  }
}
