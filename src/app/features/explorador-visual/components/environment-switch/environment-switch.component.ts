import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AmbienteExplorador } from '../../models/explorador-visual.model';

@Component({
  selector: 'app-explorador-environment-switch',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './environment-switch.component.html',
  styleUrl: './environment-switch.component.scss',
})
export class EnvironmentSwitchComponent {
  @Input() ambiente: AmbienteExplorador = 'cloud';
  @Input() disabled = false;
  @Output() ambienteChange = new EventEmitter<AmbienteExplorador>();
}
