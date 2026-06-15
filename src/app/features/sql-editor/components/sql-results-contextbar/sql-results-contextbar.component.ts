import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

interface SqlInsight {
  label: string;
  value: string;
}

@Component({
  selector: 'app-sql-results-contextbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sql-results-contextbar.component.html',
  styleUrl: './sql-results-contextbar.component.scss',
})
export class SqlResultsContextbarComponent {
  @Input() insights: SqlInsight[] = [];
  @Input() warnings: string[] = [];
}