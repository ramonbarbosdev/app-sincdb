import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-explorador-diagram-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './diagram-toolbar.component.html',
  styleUrl: './diagram-toolbar.component.scss',
})
export class DiagramToolbarComponent {
  @Input() totalNodes = 0;
  @Input() totalEdges = 0;
}
