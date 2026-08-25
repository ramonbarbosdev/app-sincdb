import { FFlowModule } from '@foblex/flow';
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ErdImpactZone, ImpactCategoryChip } from '../../models/sync-diagram.model';

@Component({
  selector: 'app-sync-erd-impact-zone',
  standalone: true,
  imports: [CommonModule, FFlowModule],
  templateUrl: './sync-erd-impact-zone.component.html',
  styleUrls: ['../../sync-diagram.theme.scss', './sync-erd-impact-zone.component.scss'],
})
export class SyncErdImpactZoneComponent {
  @Input({ required: true }) zone!: ErdImpactZone;

  chipPrefix(chip: ImpactCategoryChip): string {
    const map: Record<string, string> = {
      created: '+',
      altered: 'Δ',
      linked: '→',
      syncing: '◎',
      insert: '+',
      update: '~',
      error: '!',
    };
    return map[chip.key] ?? '•';
  }
}
