import { computed, Injectable, inject } from '@angular/core';
import { LayoutService } from '../../../layout/service/layout.service';

export type SyncDiagramCanvasTheme = 'dark' | 'light';

@Injectable()
export class SyncDiagramThemeService {
  private layoutService = inject(LayoutService);

  readonly isDark = computed(() => this.layoutService.layoutConfig().darkTheme ?? true);
  readonly isLight = computed(() => !this.isDark());

  toggle(): void {
    this.layoutService.layoutConfig.update((state) => ({
      ...state,
      darkTheme: !state.darkTheme,
    }));
  }

  setTheme(theme: SyncDiagramCanvasTheme): void {
    const darkTheme = theme === 'dark';
    this.layoutService.layoutConfig.update((state) => ({
      ...state,
      darkTheme,
    }));
  }
}
