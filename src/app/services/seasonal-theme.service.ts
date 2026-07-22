import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { BaseService } from './base.service';
import { ParametroService } from './parametro.service';
import { Parametromaster } from '../models/parametromaster';
import {
  DEFAULT_SEASONAL_CONFIG,
  SEASONAL_CACHE_KEY,
  SEASONAL_OPT_OUT_KEY,
  SEASONAL_PARAM_CODIGO,
  SeasonalAdminConfig,
  SeasonalSlots,
  SeasonalThemeId,
  getSeasonalTheme,
  resolveAutoTheme,
} from '../models/seasonal-theme';

@Injectable({ providedIn: 'root' })
export class SeasonalThemeService {
  private baseService = inject(BaseService);
  private parametroService = inject(ParametroService);

  private readonly configSignal = signal<SeasonalAdminConfig>(
    this.normalizeConfig(this.readCache() || DEFAULT_SEASONAL_CONFIG)
  );
  private readonly optOutSignal = signal(this.readOptOut());
  private readonly nowSignal = signal(new Date());
  private readonly previewThemeId = signal<SeasonalThemeId | null>(null);
  private paramId: number | string | null = null;

  readonly config = this.configSignal.asReadonly();
  readonly optedOut = this.optOutSignal.asReadonly();

  readonly activeThemeId = computed<SeasonalThemeId>(() => {
    const preview = this.previewThemeId();
    if (preview) {
      return preview;
    }

    if (this.optOutSignal()) {
      return 'none';
    }

    const config = this.configSignal();
    if (!config.enabled || config.mode === 'off') {
      return 'none';
    }

    if (config.mode === 'manual') {
      return config.manualTheme || 'none';
    }

    return resolveAutoTheme(this.nowSignal());
  });

  readonly activeTheme = computed(() => getSeasonalTheme(this.activeThemeId()));

  readonly resolvedSlots = computed<SeasonalSlots | null>(() => {
    const themeId = this.activeThemeId();
    if (themeId === 'none') {
      return null;
    }
    return this.resolveSlotsForTheme(themeId);
  });

  readonly greeting = computed(() => {
    const slots = this.resolvedSlots();
    if (!slots?.greeting.enabled) {
      return '';
    }
    return slots.greeting.message || this.activeTheme()?.greeting || '';
  });

  readonly greetingIcon = computed(() => {
    return this.resolvedSlots()?.greeting.icon || 'pi pi-sparkles';
  });

  readonly isActive = computed(() => {
    const slots = this.resolvedSlots();
    if (!slots) {
      return false;
    }
    return (
      (slots.logo.enabled && slots.logo.overlay !== 'none') ||
      slots.topbar.enabled ||
      (slots.ambient.enabled && slots.ambient.effect !== 'none') ||
      (slots.greeting.enabled && !!slots.greeting.message)
    );
  });

  readonly showGreeting = computed(() => {
    const slots = this.resolvedSlots();
    return !!slots?.greeting.enabled && !!this.greeting();
  });

  init() {
    this.loadFromBackend().subscribe();
    this.applyToDom();
  }

  loadFromBackend(): Observable<SeasonalAdminConfig> {
    return this.parametroService.getParametro(SEASONAL_PARAM_CODIGO).pipe(
      map((param) => {
        if (!param) {
          return this.configSignal();
        }
        this.paramId = (param as any).id || (param as any).id_parametromaster || null;
        const parsed = this.parseConfig(String(param.valor ?? ''));
        return parsed || this.configSignal();
      }),
      catchError(() => of(this.configSignal())),
      tap((config) => {
        const normalized = this.normalizeConfig(config);
        this.configSignal.set(normalized);
        this.writeCache(normalized);
        this.applyToDom();
      })
    );
  }

  saveConfig(config: SeasonalAdminConfig): Observable<boolean> {
    const normalized = this.normalizeConfig(config);
    this.configSignal.set(normalized);
    this.writeCache(normalized);
    this.previewThemeId.set(null);
    this.applyToDom();

    const payload: Parametromaster = {
      id: this.paramId as any,
      codigo: SEASONAL_PARAM_CODIGO,
      nomeChave: 'Experiências sazonais',
      valor: JSON.stringify(normalized),
      tipo: 'text',
      observacoes: 'Configuração de temas sazonais do SyncDB (DEV)',
    };

    const request$ = this.paramId
      ? this.baseService.update('parametromaster/', payload)
      : this.baseService.create('parametromaster/cadastrar', payload);

    return request$.pipe(
      tap((res: any) => {
        const id = res?.id || res?.id_parametromaster || this.paramId;
        if (id) {
          this.paramId = id;
        }
      }),
      map(() => true),
      catchError(() => of(true))
    );
  }

  setOptOut(value: boolean) {
    this.optOutSignal.set(value);
    try {
      localStorage.setItem(SEASONAL_OPT_OUT_KEY, value ? '1' : '0');
    } catch {
      // ignore
    }
    this.applyToDom();
  }

  refreshDate(date = new Date()) {
    this.nowSignal.set(date);
    this.applyToDom();
  }

  previewTheme(themeId: SeasonalThemeId) {
    this.previewThemeId.set(themeId);
    this.applyToDom();
  }

  clearPreview() {
    this.previewThemeId.set(null);
    this.applyToDom();
  }

  resolveSlotsForTheme(themeId: SeasonalThemeId): SeasonalSlots | null {
    if (themeId === 'none') {
      return null;
    }
    const theme = getSeasonalTheme(themeId);
    return theme ? structuredClone(theme.slots) : null;
  }

  applyToDom() {
    const themeId = this.activeThemeId();
    const slots = this.resolvedSlots();
    this.applyThemeToDom(themeId, slots, this.greeting());
  }

  private applyThemeToDom(
    themeId: SeasonalThemeId,
    slots: SeasonalSlots | null,
    greeting: string
  ) {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;
    const theme = getSeasonalTheme(themeId);

    root.classList.forEach((cls) => {
      if (cls.startsWith('seasonal-')) {
        root.classList.remove(cls);
      }
    });

    const clearAttrs = () => {
      root.removeAttribute('data-season-logo');
      root.removeAttribute('data-season-topbar');
      root.removeAttribute('data-season-ambient');
      root.removeAttribute('data-season-greeting');
      root.style.removeProperty('--season-accent');
      root.style.removeProperty('--season-glow');
      root.style.removeProperty('--season-greeting');
    };

    if (!theme || themeId === 'none' || !slots) {
      root.classList.remove('seasonal-active');
      clearAttrs();
      return;
    }

    root.classList.add('seasonal-active', `seasonal-${themeId}`);

    const accent = slots.topbar.accent || theme.accent;
    root.style.setProperty('--season-accent', accent);
    root.style.setProperty('--season-glow', theme.glow);
    root.style.setProperty('--season-greeting', `"${greeting.replace(/"/g, '')}"`);

    root.setAttribute(
      'data-season-logo',
      slots.logo.enabled ? slots.logo.overlay : 'none'
    );
    root.setAttribute('data-season-topbar', slots.topbar.enabled ? 'on' : 'off');
    root.setAttribute(
      'data-season-ambient',
      slots.ambient.enabled ? slots.ambient.effect : 'none'
    );
    root.setAttribute(
      'data-season-greeting',
      slots.greeting.enabled && greeting ? 'on' : 'off'
    );
  }

  private normalizeConfig(config: SeasonalAdminConfig): SeasonalAdminConfig {
    return {
      enabled: !!config.enabled,
      mode: config.mode || 'auto',
      manualTheme: config.manualTheme || 'none',
      // Visual/slots só no código — campos legados ignorados
      customMessage: '',
      themeOverrides: {},
    };
  }

  private parseConfig(raw: string): SeasonalAdminConfig | null {
    try {
      const parsed = JSON.parse(raw) as SeasonalAdminConfig;
      return this.normalizeConfig(parsed);
    } catch {
      return null;
    }
  }

  private readCache(): SeasonalAdminConfig | null {
    try {
      const raw = localStorage.getItem(SEASONAL_CACHE_KEY);
      return raw ? this.parseConfig(raw) : null;
    } catch {
      return null;
    }
  }

  private writeCache(config: SeasonalAdminConfig) {
    try {
      localStorage.setItem(SEASONAL_CACHE_KEY, JSON.stringify(config));
    } catch {
      // ignore
    }
  }

  private readOptOut(): boolean {
    try {
      return localStorage.getItem(SEASONAL_OPT_OUT_KEY) === '1';
    } catch {
      return false;
    }
  }
}
