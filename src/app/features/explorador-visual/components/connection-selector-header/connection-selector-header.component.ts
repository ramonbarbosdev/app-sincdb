import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import {
  ModoOperacao,
  ModoVisualizacao,
  SelectOption,
} from '../../models/explorador-visual.model';

@Component({
  selector: 'app-explorador-connection-selector-header',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, SelectModule],
  templateUrl: './connection-selector-header.component.html',
  styleUrl: './connection-selector-header.component.scss',
})
export class ConnectionSelectorHeaderComponent {
  @Input() base = '';
  @Input() schema = '';
  @Input() conexao = '';
  @Input() modoOperacao: ModoOperacao = 'explorar';
  @Input() modoVisualizacao: ModoVisualizacao = 'schema_completo';
  @Input() conexoes: SelectOption[] = [];
  @Input() bases: SelectOption[] = [];
  @Input() schemas: SelectOption[] = [];
  @Input() loadingConexoes = false;
  @Input() loadingBases = false;
  @Input() loadingSchemas = false;
  @Input() loadingComparacao = false;

  @Output() conexaoChange = new EventEmitter<string>();
  @Output() modoOperacaoChange = new EventEmitter<ModoOperacao>();
  @Output() baseChange = new EventEmitter<string>();
  @Output() schemaChange = new EventEmitter<string>();
  @Output() modoVisualizacaoChange = new EventEmitter<ModoVisualizacao>();
  @Output() comparar = new EventEmitter<void>();

  modosOperacao: SelectOption[] = [
    { label: 'Explorar', value: 'explorar' },
    { label: 'Comparar', value: 'comparar' },
  ];

  modosVisualizacao: SelectOption[] = [
    { label: 'Schema completo', value: 'schema_completo' },
    { label: 'Tabela focada', value: 'tabela_focada' },
    { label: 'Apenas diferencas', value: 'apenas_diferencas' },
  ];
}
