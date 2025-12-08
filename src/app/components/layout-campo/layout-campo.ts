import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-layout-campo',
  imports: [CommonModule, FormsModule, MessageModule],
  templateUrl: './layout-campo.html',
  styleUrl: './layout-campo.scss',
  host: {
    '[class]': 'width',
  },
})
export class LayoutCampo {
  @Input() idInput: string = '';
  @Input() label: string = '';
  @Input() sublabel: string = '';
  @Input() describedby: string = '';
  @Input() width: string = 'w-full';
  @Input() error: string | null = null;
}
