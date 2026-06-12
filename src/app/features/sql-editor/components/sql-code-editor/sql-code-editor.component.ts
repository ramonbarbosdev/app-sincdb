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
import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import { DangerousSqlCheck } from '../../models/sql-editor.model';
import { SqlToolbarComponent } from '../sql-toolbar/sql-toolbar.component';

type MonacoApi = typeof Monaco;

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
  @Output() sqlChange = new EventEmitter<string>();
  @Output() formatar = new EventEmitter<void>();
  @Output() executar = new EventEmitter<void>();
  @Output() executarSelecionado = new EventEmitter<string>();
  @Output() limpar = new EventEmitter<void>();
  @Output() salvar = new EventEmitter<void>();
  @Output() historico = new EventEmitter<void>();

  expanded = false;

  private static themeRegistered = false;
  private editor?: Monaco.editor.IStandaloneCodeEditor;
  private resizeObserver?: ResizeObserver;
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
    this.resizeObserver?.disconnect();
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

  toggleExpanded(): void {
    this.expanded = !this.expanded;
    setTimeout(() => this.editor?.layout());
  }

  private configureMonaco(monacoApi: MonacoApi): void {
    (globalThis as { MonacoEnvironment?: Monaco.Environment }).MonacoEnvironment = {
      getWorker: () =>
        new Worker(
          new URL(
            '../../../../../../node_modules/monaco-editor/esm/vs/editor/editor.worker.js',
            import.meta.url
          ),
          { type: 'module' }
        ),
    };

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


  private async createEditor(): Promise<void> {
    if (!this.monacoContainer?.nativeElement) return;

    const [monacoApi] = await Promise.all([
      import('monaco-editor/esm/vs/editor/editor.api.js'),
      import('monaco-editor/esm/vs/basic-languages/sql/sql.contribution.js'),
    ]);

    this.configureMonaco(monacoApi);

    this.editor = monacoApi.editor.create(this.monacoContainer.nativeElement, {
      value: this.sql,
      language: 'sql',
      theme: this.getMonacoTheme(),
      automaticLayout: true,
      minimap: { enabled: false },
      fontFamily: '"Cascadia Code", "Consolas", "Monaco", monospace',
      fontSize: 14,
      lineHeight: 22,
      tabSize: 2,
      wordWrap: 'on',
      scrollBeyondLastLine: false,
      renderLineHighlight: 'line',
      roundedSelection: false,
      padding: { top: 14, bottom: 14 },
      scrollbar: {
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
      },
    });

    this.editor.onDidChangeModelContent(() => {
      if (this.updatingFromInput) return;
      this.sqlChange.emit(this.editor?.getValue() || '');
    });

    this.editor.addCommand(monacoApi.KeyMod.CtrlCmd | monacoApi.KeyCode.Enter, () => {
      this.executar.emit();
    });

    this.resizeObserver = new ResizeObserver(() => this.editor?.layout());
    this.resizeObserver.observe(this.monacoContainer.nativeElement);
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

  private getMonacoTheme(): string {
    return this.isLightMode() ? 'syncdb-sql-light' : 'syncdb-sql-dark';
  }

  private isLightMode(): boolean {
    const html = document.documentElement;
    const body = document.body;

    return (
      html.classList.contains('light') ||
      html.classList.contains('p-light') ||
      body.classList.contains('light') ||
      body.classList.contains('p-light') ||
      getComputedStyle(document.documentElement).colorScheme === 'light'
    );
  }
}
