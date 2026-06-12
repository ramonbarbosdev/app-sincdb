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
import { MenuModule } from 'primeng/menu';
import { MessageModule } from 'primeng/message';
import { MenuItem } from 'primeng/api';
import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import { DangerousSqlCheck } from '../../models/sql-editor.model';

type MonacoApi = typeof Monaco;

@Component({
  selector: 'app-sql-code-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, MenuModule, MessageModule],
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

  menuItems: MenuItem[] = [
    { label: 'Explicar consulta', icon: 'pi pi-sparkles', disabled: true },
    { label: 'Salvar como template', icon: 'pi pi-bookmark', disabled: true },
  ];

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
        { token: 'keyword.sql', foreground: 'd8c9ff', fontStyle: 'bold' },
        { token: 'operator.sql', foreground: 'b08cff' },
        { token: 'string.sql', foreground: 'f4d35e' },
        { token: 'number.sql', foreground: '2cb67d' },
        { token: 'comment.sql', foreground: '72757e', fontStyle: 'italic' },
      ],
      colors: {
        'editor.background': '#101014',
        'editor.foreground': '#fffffe',
        'editorLineNumber.foreground': '#94a1b2',
        'editorLineNumber.activeForeground': '#d8c9ff',
        'editorCursor.foreground': '#7f5af0',
        'editor.selectionBackground': '#7f5af055',
        'editor.lineHighlightBackground': '#7f5af012',
        'editorGutter.background': '#101014',
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
      theme: 'syncdb-sql-dark',
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
}
