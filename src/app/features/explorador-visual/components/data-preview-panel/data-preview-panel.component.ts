import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DadosTabelaPreview } from '../../models/explorador-visual.model';

@Component({
  selector: 'app-explorador-data-preview-panel',
  standalone: true,
  imports: [CommonModule, ProgressSpinnerModule],
  templateUrl: './data-preview-panel.component.html',
  styleUrl: './data-preview-panel.component.scss',
})
export class DataPreviewPanelComponent {
  @Input() dados?: DadosTabelaPreview;
  @Input() loading = false;
}
