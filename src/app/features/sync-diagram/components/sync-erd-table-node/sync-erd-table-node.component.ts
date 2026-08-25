import { FFlowModule } from '@foblex/flow';
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ErdTableNode, TableVisualStatus } from '../../models/sync-diagram.model';

@Component({
  selector: 'app-sync-erd-table-node',
  standalone: true,
  imports: [CommonModule, FFlowModule],
  templateUrl: './sync-erd-table-node.component.html',
  styleUrls: ['../../sync-diagram.theme.scss', './sync-erd-table-node.component.scss'],
})
export class SyncErdTableNodeComponent {
  @Input({ required: true }) table!: ErdTableNode;

  displayName(): string {
    const nome = this.table.nome;
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
