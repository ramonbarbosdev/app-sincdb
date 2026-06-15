import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  DangerousSqlCheck,
  SqlCatalogResponse,
  SqlCatalogTableSelection,
  SqlEditorState,
  SqlQueryTab,
} from '../../models/sql-editor.model';
import { SqlCodeEditorComponent } from '../sql-code-editor/sql-code-editor.component';

@Component({
  selector: 'app-sql-editor-pane',
  standalone: true,
  imports: [CommonModule, SqlCodeEditorComponent],
  templateUrl: './sql-editor-pane.component.html',
  styleUrl: './sql-editor-pane.component.scss',
})
export class SqlEditorPaneComponent {
  @Input() sql = '';
  @Input() state: SqlEditorState = 'initial';
  @Input() danger: DangerousSqlCheck = { dangerous: false, reason: '' };
  @Input() catalogo?: SqlCatalogResponse;
  @Input() queryTabs: SqlQueryTab[] = [];
  @Input() activeQueryTabId = '';

  @Output() sqlChange = new EventEmitter<string>();
  @Output() formatar = new EventEmitter<void>();
  @Output() executar = new EventEmitter<void>();
  @Output() executarSelecionado = new EventEmitter<string>();
  @Output() limpar = new EventEmitter<void>();
  @Output() salvar = new EventEmitter<void>();
  @Output() historico = new EventEmitter<void>();
  @Output() novaConsulta = new EventEmitter<void>();
  @Output() selecionarQueryTab = new EventEmitter<string>();
  @Output() fecharQueryTab = new EventEmitter<string>();
  @Output() maximizarEditor = new EventEmitter<void>();
  @Output() restaurarLayout = new EventEmitter<void>();
  @Output() propriedadesTabela = new EventEmitter<SqlCatalogTableSelection>();
}
