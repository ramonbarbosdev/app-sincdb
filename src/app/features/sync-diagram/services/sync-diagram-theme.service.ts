import { computed, Injectable, inject, signal } from '@angular/core';
import { LayoutService } from '../../../layout/service/layout.service';

export type SyncDiagramCanvasTheme = 'dark' | 'light';

const STORAGE_KEY = 'sync-diagram-canvas-theme';

@Injectable()
export class SyncDiagramThemeService {
  private layoutService = inject(LayoutService);

  readonly theme = signal<SyncDiagramCanvasTheme>(this.loadInitialTheme());
  readonly isDark = computed(() => this.theme() === 'dark');
  readonly isLight = computed(() => this.theme() === 'light');

  toggle(): void {
    const next: SyncDiagramCanvasTheme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    this.persist(next);
  }

  setTheme(theme: SyncDiagramCanvasTheme): void {
    if (this.theme() !== theme) {
      this.theme.set(theme);
      this.persist(theme);
    }
  }

  private loadInitialTheme(): SyncDiagramCanvasTheme {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch {
      // private mode — ignore
    }
    return this.layoutService.layoutConfig().darkTheme ? 'dark' : 'light';
  }

  private persist(theme: SyncDiagramCanvasTheme): void {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // quota or private mode — ignore
    }
  }
}
