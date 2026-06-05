import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import {
  ModoOperacao,
  SelectOption,
  AmbienteExplorador,
} from '../../models/explorador-visual.model';

@Component({
  selector: 'app-explorador-connection-selector-header',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, SelectModule],
  templateUrl: './connection-selector-header.component.html',
  styleUrl: './connection-selector-header.component.scss',
})
export class ConnectionSelectorHeaderComponent {
  @Input() conexao = '';
  @Input() ambiente: AmbienteExplorador = 'cloud';
  @Input() modoOperacao: ModoOperacao = 'explorar';
  @Input() conexoes: SelectOption[] = [];
  @Input() ambientes: SelectOption[] = [];
  @Input() loadingConexoes = false;

  @Output() conexaoChange = new EventEmitter<string>();
  @Output() ambienteChange = new EventEmitter<AmbienteExplorador>();
  @Output() modoOperacaoChange = new EventEmitter<ModoOperacao>();
  @Output() refresh = new EventEmitter<void>();

  modosOperacao: SelectOption[] = [
    { label: 'Explorar', value: 'explorar' },
    { label: 'Comparar', value: 'comparar' },
  ];

}
