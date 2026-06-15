import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import type * as Monaco from 'monaco-editor';
import {
  DangerousSqlCheck,
  SqlCatalogColumn,
  SqlCatalogResponse,
  SqlCatalogSchema,
  SqlCatalogTable,
  SqlCatalogTableSelection,
} from '../../models/sql-editor.model';
import { SqlToolbarComponent } from '../sql-toolbar/sql-toolbar.component';

type MonacoApi = typeof Monaco;
type MonacoLoaderRequire = {
  config: (config: { paths: { vs: string } }) => void;
  (dependencies: string[], callback: (monacoApi: MonacoApi) => void, errorCallback?: (error: unknown) => void): void;
};

declare global {
  interface Window {
    monaco?: MonacoApi;
    require?: MonacoLoaderRequire;
  }
}

@Component({
  selector: 'app-sql-code-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, MessageModule, SqlToolbarComponent],
  templateUrl: './sql-code-editor.component.html',
  styleUrl: './sql-code-editor.component.scss',
})
export class SqlCodeEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('monacoContainer') monacoContainer?: ElementRef<HTMLDivElement>;

  @Input() sql = '';
  @Input() executing = false;
  @Input() danger: DangerousSqlCheck = { dangerous: false, reason: '' };
  @Input() catalogo?: SqlCatalogResponse;

  @Output() sqlChange = new EventEmitter<string>();
  @Output() formatar = new EventEmitter<void>();
  @Output() executar = new EventEmitter<void>();
  @Output() executarSelecionado = new EventEmitter<string>();
  @Output() limpar = new EventEmitter<void>();
  @Output() salvar = new EventEmitter<void>();
  @Output() historico = new EventEmitter<void>();
  @Output() propriedadesTabela = new EventEmitter<SqlCatalogTableSelection>();

  expanded = false;

  private static themeRegistered = false;
  private static monacoLoadPromise?: Promise<MonacoApi>;

  private editor?: Monaco.editor.IStandaloneCodeEditor;
  private monacoApi?: MonacoApi;
  private resizeObserver?: ResizeObserver;
  private themeObserver?: MutationObserver;
  private completionProviderDisposable?: Monaco.IDisposable;
  private tableLinkDecorations?: Monaco.editor.IEditorDecorationsCollection;
  private tableLinkDisposables: Monaco.IDisposable[] = [];
  private hoveredTable?: SqlCatalogTableSelection;
  private updatingFromInput = false;

  ngAfterViewInit(): void {
    void this.createEditor();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['sql'] || !this.editor) return;

    const model = this.editor.getModel();

    if (!model || model.getValue() === this.sql) return;

    this.updatingFromInput = true;
    model.setValue(this.sql);
    this.updatingFromInput = false;
  }

  ngOnDestroy(): void {
    this.themeObserver?.disconnect();
    this.resizeObserver?.disconnect();
    this.completionProviderDisposable?.dispose();
    this.tableLinkDecorations?.clear();
    this.tableLinkDisposables.forEach((disposable) => disposable.dispose());
    this.editor?.dispose();
  }

  @HostListener('keydown.control.enter', ['$event'])
  onCtrlEnter(event: Event): void {
    event.preventDefault();
    this.executar.emit();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.editor?.layout();
  }

  @HostListener('window:keyup', ['$event'])
  onWindowKeyUp(event: KeyboardEvent): void {
    if (event.key === 'Control' || event.key === 'Meta') {
      this.clearTableHover();
    }
  }

  toggleExpanded(): void {
    this.expanded = !this.expanded;

    setTimeout(() => {
      this.editor?.layout();
    });
  }

  emitSelectedSql(): void {
    const model = this.editor?.getModel();
    const selection = this.editor?.getSelection();

    if (!model || !selection || selection.isEmpty()) {
      this.executarSelecionado.emit(this.editor?.getValue() || this.sql);
      return;
    }

    this.executarSelecionado.emit(model.getValueInRange(selection));
  }

  private async createEditor(): Promise<void> {
    if (!this.monacoContainer?.nativeElement) return;

    const monacoApi = await this.loadMonaco();

    this.monacoApi = monacoApi;

    this.configureMonaco(monacoApi);
    this.registerSqlCompletionProvider(monacoApi);

    this.editor = monacoApi.editor.create(this.monacoContainer.nativeElement, {
      value: this.sql,
      language: 'sql',
      theme: this.getMonacoTheme(),
      automaticLayout: true,
      minimap: { enabled: false },
      fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
      fontSize: 13,
      lineHeight: 20,
      tabSize: 2,
      wordWrap: 'off',
      scrollBeyondLastLine: false,
      renderLineHighlight: 'line',
      roundedSelection: true,
      padding: { top: 12, bottom: 12 },
      lineNumbersMinChars: 3,
      glyphMargin: false,
      folding: true,
      lineDecorationsWidth: 8,
      overviewRulerBorder: false,
      hideCursorInOverviewRuler: true,
      scrollbar: {
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
        alwaysConsumeMouseWheel: false,
      },
    });

    this.editor.onDidChangeModelContent(() => {
      if (this.updatingFromInput) return;

      this.sqlChange.emit(this.editor?.getValue() || '');
    });

    this.editor.addCommand(monacoApi.KeyMod.CtrlCmd | monacoApi.KeyCode.Enter, () => {
      this.executar.emit();
    });

    this.registerSqlTableHover(monacoApi);

    this.scheduleEditorLayout();

    this.resizeObserver = new ResizeObserver(() => {
      this.scheduleEditorLayout();
    });

    this.resizeObserver.observe(this.monacoContainer.nativeElement);

    this.observeThemeChanges();
  }

  private scheduleEditorLayout(): void {
    [0, 50, 150, 300].forEach((delay) => {
      setTimeout(() => {
        this.editor?.layout();
      }, delay);
    });
  }

  private loadMonaco(): Promise<MonacoApi> {
    SqlCodeEditorComponent.monacoLoadPromise ??= new Promise<MonacoApi>((resolve, reject) => {
      const monacoBaseUrl = new URL('assets/monaco/vs', document.baseURI).toString();

      const configureLoader = (): void => {
        if (!window.require) {
          reject(new Error('Monaco loader was not available after loading loader.js.'));
          return;
        }

        window.require.config({ paths: { vs: monacoBaseUrl } });
        window.require(['vs/editor/editor.main'], resolve, reject);
      };

      if (window.monaco) {
        resolve(window.monaco);
        return;
      }

      if (window.require) {
        configureLoader();
        return;
      }

      const loaderScript = document.createElement('script');
      loaderScript.src = new URL('assets/monaco/vs/loader.js', document.baseURI).toString();
      loaderScript.async = true;
      loaderScript.onload = configureLoader;
      loaderScript.onerror = () => reject(new Error(`Unable to load Monaco from ${loaderScript.src}`));

      document.head.appendChild(loaderScript);
    });

    return SqlCodeEditorComponent.monacoLoadPromise;
  }

  private configureMonaco(monacoApi: MonacoApi): void {

    if (SqlCodeEditorComponent.themeRegistered) return;

    monacoApi.editor.defineTheme('syncdb-sql-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword.sql', foreground: '10B981', fontStyle: 'bold' },
        { token: 'operator.sql', foreground: '94A3B8' },
        { token: 'string.sql', foreground: 'F59E0B' },
        { token: 'number.sql', foreground: '38BDF8' },
        { token: 'comment.sql', foreground: '64748B', fontStyle: 'italic' },
      ],
      colors: {
        'editor.background': '#0B0F14',
        'editor.foreground': '#F8FAFC',
        'editorLineNumber.foreground': '#64748B',
        'editorLineNumber.activeForeground': '#10B981',
        'editorCursor.foreground': '#10B981',
        'editor.selectionBackground': '#10B98140',
        'editor.lineHighlightBackground': '#10B98112',
        'editorGutter.background': '#0B0F14',
      },
    });

    monacoApi.editor.defineTheme('syncdb-sql-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword.sql', foreground: '047857', fontStyle: 'bold' },
        { token: 'operator.sql', foreground: '475569' },
        { token: 'string.sql', foreground: 'B45309' },
        { token: 'number.sql', foreground: '0369A1' },
        { token: 'comment.sql', foreground: '64748B', fontStyle: 'italic' },
      ],
      colors: {
        'editor.background': '#FFFFFF',
        'editor.foreground': '#0F172A',
        'editorLineNumber.foreground': '#94A3B8',
        'editorLineNumber.activeForeground': '#047857',
        'editorCursor.foreground': '#047857',
        'editor.selectionBackground': '#10B98133',
        'editor.lineHighlightBackground': '#10B98110',
        'editorGutter.background': '#FFFFFF',
      },
    });

    SqlCodeEditorComponent.themeRegistered = true;
  }

  private registerSqlCompletionProvider(monacoApi: MonacoApi): void {
    this.completionProviderDisposable?.dispose();

    this.completionProviderDisposable = monacoApi.languages.registerCompletionItemProvider('sql', {
      triggerCharacters: ['.', ' ', '"'],
      provideCompletionItems: (model, position) => {
        const catalogo = this.catalogo;
        const range = this.getCompletionRange(monacoApi, model, position);

        if (!catalogo?.schemas?.length) {
          return { suggestions: [] };
        }

        const lineUntilCursor = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });
        const dotContext = this.getDotContext(lineUntilCursor);

        if (dotContext) {
          return {
            suggestions: this.getColumnsForQualifier(model.getValue(), dotContext, catalogo).map((column) =>
              this.createColumnSuggestion(monacoApi, column, range)
            ),
          };
        }

        return {
          suggestions: [
            ...this.createSchemaSuggestions(monacoApi, catalogo.schemas, range),
            ...this.createTableSuggestions(monacoApi, catalogo.schemas, range),
            ...this.createColumnSuggestions(monacoApi, catalogo.schemas, range),
          ],
        };
      },
    });
  }

  private registerSqlTableHover(monacoApi: MonacoApi): void {
    if (!this.editor) return;

    this.tableLinkDecorations = this.editor.createDecorationsCollection();
    this.tableLinkDisposables.forEach((disposable) => disposable.dispose());

    this.tableLinkDisposables = [
      this.editor.onMouseMove((event) => {
        if (!event.event.ctrlKey && !event.event.metaKey) {
          this.clearTableHover();
          return;
        }

        const match = this.getTableReferenceAtPosition(monacoApi, event.target.position);
        if (!match) {
          this.clearTableHover();
          return;
        }

        this.hoveredTable = match.selection;
        this.tableLinkDecorations?.set([
          {
            range: match.range,
            options: {
              inlineClassName: 'sql-table-link-hover',
              hoverMessage: {
                value: `Abrir propriedades de **${match.selection.schema}.${match.selection.name}**`,
              },
            },
          },
        ]);
      }),
      this.editor.onMouseDown((event) => {
        if ((!event.event.ctrlKey && !event.event.metaKey) || !this.hoveredTable) return;

        this.propriedadesTabela.emit(this.hoveredTable);
        this.clearTableHover();
      }),
      this.editor.onMouseLeave(() => {
        this.clearTableHover();
      }),
      this.editor.onKeyUp((event) => {
        if (event.browserEvent.key === 'Control' || event.browserEvent.key === 'Meta') {
          this.clearTableHover();
        }
      }),
      this.editor.onKeyDown((event) => {
        if (!event.ctrlKey && !event.metaKey) {
          this.clearTableHover();
        }
      }),
    ];
  }

  private getTableReferenceAtPosition(
    monacoApi: MonacoApi,
    position: Monaco.Position | null
  ): { range: Monaco.Range; selection: SqlCatalogTableSelection } | undefined {
    const model = this.editor?.getModel();
    const catalogo = this.catalogo;
    if (!model || !catalogo?.schemas?.length || !position) return undefined;

    const sql = model.getValue();
    const identifier = String.raw`(?:"[^"]+"|\[[^\]]+\]|[a-zA-Z_][\w$]*)`;
    const tableReference = String.raw`(${identifier}(?:\s*\.\s*${identifier})?)`;
    const tablePattern = new RegExp(String.raw`\b(?:FROM|JOIN)\s+${tableReference}`, 'gi');

    for (const match of sql.matchAll(tablePattern)) {
      const reference = match[1] || '';
      const selection = this.findTableSelectionFromCatalog(catalogo, reference);
      if (!selection || match.index === undefined) continue;

      const referenceStart = sql.indexOf(reference, match.index);
      if (referenceStart < 0) continue;

      const start = model.getPositionAt(referenceStart);
      const end = model.getPositionAt(referenceStart + reference.length);
      const range = new monacoApi.Range(start.lineNumber, start.column, end.lineNumber, end.column);

      if (range.containsPosition(position)) {
        return { range, selection };
      }
    }

    return undefined;
  }

  private clearTableHover(): void {
    this.hoveredTable = undefined;
    this.tableLinkDecorations?.clear();
  }

  private getCompletionRange(
    monacoApi: MonacoApi,
    model: Monaco.editor.ITextModel,
    position: Monaco.Position
  ): Monaco.IRange {
    const word = model.getWordUntilPosition(position);

    return new monacoApi.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
  }

  private getDotContext(lineUntilCursor: string): string {
    const match = /((?:"[^"]+"|\[[^\]]+\]|[a-zA-Z_][\w$]*))\.\s*$/.exec(lineUntilCursor);
    return match?.[1] ? this.normalizeIdentifier(match[1]) : '';
  }

  private getColumnsForQualifier(
    sql: string,
    qualifier: string,
    catalogo: SqlCatalogResponse
  ): SqlCatalogColumn[] {
    const aliasMap = this.extractAliasMap(sql, catalogo);
    const tableFromAlias = aliasMap.get(this.normalizeIdentifier(qualifier).toLowerCase());
    const table = tableFromAlias || this.findTable(catalogo, qualifier);

    return table?.columns || [];
  }

  private createSchemaSuggestions(
    monacoApi: MonacoApi,
    schemas: SqlCatalogSchema[],
    range: Monaco.IRange
  ): Monaco.languages.CompletionItem[] {
    return schemas.map((schema) => ({
      label: schema.name,
      kind: monacoApi.languages.CompletionItemKind.Module,
      insertText: schema.name,
      detail: 'Schema',
      range,
    }));
  }

  private createTableSuggestions(
    monacoApi: MonacoApi,
    schemas: SqlCatalogSchema[],
    range: Monaco.IRange
  ): Monaco.languages.CompletionItem[] {
    return schemas.flatMap((schema) =>
      schema.tables.map((table) => ({
        label: table.name,
        kind: monacoApi.languages.CompletionItemKind.Class,
        insertText: table.name,
        detail: `Tabela ${schema.name}.${table.name}`,
        range,
      }))
    );
  }

  private createColumnSuggestions(
    monacoApi: MonacoApi,
    schemas: SqlCatalogSchema[],
    range: Monaco.IRange
  ): Monaco.languages.CompletionItem[] {
    return schemas.flatMap((schema) =>
      schema.tables.flatMap((table) =>
        table.columns.map((column) => this.createColumnSuggestion(monacoApi, column, range, table))
      )
    );
  }

  private createColumnSuggestion(
    monacoApi: MonacoApi,
    column: SqlCatalogColumn,
    range: Monaco.IRange,
    table?: SqlCatalogTable
  ): Monaco.languages.CompletionItem {
    return {
      label: column.name,
      kind: monacoApi.languages.CompletionItemKind.Field,
      insertText: column.name,
      detail: table ? `${table.name}.${column.name}${column.type ? `: ${column.type}` : ''}` : column.type || 'Coluna',
      range,
    };
  }

  private extractAliasMap(sql: string, catalogo: SqlCatalogResponse): Map<string, SqlCatalogTable> {
    const aliases = new Map<string, SqlCatalogTable>();
    const reservedWords = new Set([
      'where',
      'join',
      'left',
      'right',
      'inner',
      'full',
      'cross',
      'on',
      'group',
      'order',
      'limit',
      'offset',
      'union',
      'having',
    ]);
    const identifier = String.raw`(?:"[^"]+"|\[[^\]]+\]|[a-zA-Z_][\w$]*)`;
    const tableReference = String.raw`(${identifier}(?:\s*\.\s*${identifier})?)`;
    const aliasPattern = new RegExp(
      String.raw`\b(?:FROM|JOIN)\s+${tableReference}\s+(?:AS\s+)?(${identifier})`,
      'gi'
    );

    for (const match of sql.matchAll(aliasPattern)) {
      const tableReferenceValue = match[1] || '';
      const alias = this.normalizeIdentifier(match[2] || '').toLowerCase();

      if (!alias || reservedWords.has(alias)) continue;

      const table = this.findTable(catalogo, tableReferenceValue);
      if (table) aliases.set(alias, table);
    }

    return aliases;
  }

  private findTable(catalogo: SqlCatalogResponse, tableReference: string): SqlCatalogTable | undefined {
    const parts = tableReference
      .split('.')
      .map((part) => this.normalizeIdentifier(part).toLowerCase())
      .filter(Boolean);
    const tableName = parts.at(-1);
    const schemaName = parts.length > 1 ? parts.at(-2) : undefined;

    if (!tableName) return undefined;

    for (const schema of catalogo.schemas) {
      if (schemaName && schema.name.toLowerCase() !== schemaName) continue;

      const table = schema.tables.find((item) => item.name.toLowerCase() === tableName);
      if (table) return table;
    }

    return undefined;
  }

  private findTableSelectionFromCatalog(
    catalogo: SqlCatalogResponse,
    tableReference: string
  ): SqlCatalogTableSelection | undefined {
    const parts = tableReference
      .split('.')
      .map((part) => this.normalizeIdentifier(part).toLowerCase())
      .filter(Boolean);
    const tableName = parts.at(-1);
    const schemaName = parts.length > 1 ? parts.at(-2) : undefined;

    if (!tableName) return undefined;

    for (const schema of catalogo.schemas) {
      if (schemaName && schema.name.toLowerCase() !== schemaName) continue;

      const table = schema.tables.find((item) => item.name.toLowerCase() === tableName);
      if (table) {
        return {
          schema: schema.name,
          name: table.name,
          columns: table.columns,
        };
      }
    }

    return undefined;
  }

  private normalizeIdentifier(value: string): string {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      return trimmed.slice(1, -1);
    }

    return trimmed;
  }

  private observeThemeChanges(): void {
    this.themeObserver?.disconnect();

    this.themeObserver = new MutationObserver(() => {
      this.applyMonacoTheme();
    });

    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    });

    this.themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    });
  }

  private applyMonacoTheme(): void {
    if (!this.monacoApi || !this.editor) return;

    this.monacoApi.editor.setTheme(this.getMonacoTheme());
    this.editor.layout();
  }

  private getMonacoTheme(): string {
    return this.isLightMode() ? 'syncdb-sql-light' : 'syncdb-sql-dark';
  }

  private isLightMode(): boolean {
    const html = document.documentElement;
    const body = document.body;

    const colorScheme = getComputedStyle(document.documentElement).colorScheme;
    const backgroundColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--surface-ground')
      .trim()
      .toLowerCase();

    return (
      html.classList.contains('light') ||
      html.classList.contains('p-light') ||
      html.classList.contains('light-mode') ||
      html.classList.contains('theme-light') ||
      html.getAttribute('data-theme') === 'light' ||
      body.classList.contains('light') ||
      body.classList.contains('p-light') ||
      body.classList.contains('light-mode') ||
      body.classList.contains('theme-light') ||
      body.getAttribute('data-theme') === 'light' ||
      colorScheme === 'light' ||
      backgroundColor === '#ffffff' ||
      backgroundColor === '#fff'
    );
  }
}
