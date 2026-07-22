export type SeasonalThemeId =
  | 'none'
  | 'natal'
  | 'ano-novo'
  | 'pascoa'
  | 'festa-junina'
  | 'primavera'
  | 'halloween'
  | 'dias-de-chuva';

export type SeasonalMode = 'auto' | 'manual' | 'off';

export type SeasonalLogoOverlay = 'none' | 'hat' | 'badge';
export type SeasonalAmbientEffect = 'none' | 'snow' | 'flags' | 'petals' | 'sparkle';

export interface SeasonalLogoSlot {
  enabled: boolean;
  overlay: SeasonalLogoOverlay;
}

export interface SeasonalTopbarSlot {
  enabled: boolean;
  accent: string;
}

export interface SeasonalAmbientSlot {
  enabled: boolean;
  effect: SeasonalAmbientEffect;
}

export interface SeasonalGreetingSlot {
  enabled: boolean;
  message: string;
  icon: string;
}

export interface SeasonalSlots {
  logo: SeasonalLogoSlot;
  topbar: SeasonalTopbarSlot;
  ambient: SeasonalAmbientSlot;
  greeting: SeasonalGreetingSlot;
}

export type SeasonalSlotsOverride = {
  logo?: Partial<SeasonalLogoSlot>;
  topbar?: Partial<SeasonalTopbarSlot>;
  ambient?: Partial<SeasonalAmbientSlot>;
  greeting?: Partial<SeasonalGreetingSlot>;
};

export interface SeasonalThemeDefinition {
  id: SeasonalThemeId;
  label: string;
  description: string;
  /** @deprecated prefer slots.topbar.accent */
  accent: string;
  glow: string;
  /** @deprecated prefer slots.greeting.message */
  greeting: string;
  windows: Array<{ startMonth: number; startDay: number; endMonth: number; endDay: number }>;
  slots: SeasonalSlots;
}

export interface SeasonalAdminConfig {
  enabled: boolean;
  mode: SeasonalMode;
  manualTheme: SeasonalThemeId;
  /** @deprecated visual/saudação só no código (`*.theme.ts`) */
  customMessage: string;
  /** @deprecated slots só no código (`*.theme.ts`) */
  themeOverrides: Partial<Record<Exclude<SeasonalThemeId, 'none'>, SeasonalSlotsOverride>>;
}

export const SEASONAL_PARAM_CODIGO = 'SEASONAL_THEME_CONFIG';
export const SEASONAL_OPT_OUT_KEY = 'sincdb.seasonal.optout';
export const SEASONAL_CACHE_KEY = 'sincdb.seasonal.config';

export const DEFAULT_SEASONAL_CONFIG: SeasonalAdminConfig = {
  enabled: true,
  mode: 'auto',
  manualTheme: 'none',
  customMessage: '',
  themeOverrides: {},
};

export function createSlots(partial: {
  logo?: Partial<SeasonalLogoSlot>;
  topbar?: Partial<SeasonalTopbarSlot>;
  ambient?: Partial<SeasonalAmbientSlot>;
  greeting?: Partial<SeasonalGreetingSlot>;
}): SeasonalSlots {
  return {
    logo: {
      enabled: partial.logo?.enabled ?? true,
      overlay: partial.logo?.overlay ?? 'none',
    },
    topbar: {
      enabled: partial.topbar?.enabled ?? true,
      accent: partial.topbar?.accent ?? '#7f5af0',
    },
    ambient: {
      enabled: partial.ambient?.enabled ?? true,
      effect: partial.ambient?.effect ?? 'none',
    },
    greeting: {
      enabled: partial.greeting?.enabled ?? true,
      message: partial.greeting?.message ?? '',
      icon: partial.greeting?.icon ?? 'pi pi-sparkles',
    },
  };
}

export function mergeSlots(
  base: SeasonalSlots,
  override?: SeasonalSlotsOverride
): SeasonalSlots {
  if (!override) {
    return structuredClone(base);
  }
  return {
    logo: { ...base.logo, ...override.logo },
    topbar: { ...base.topbar, ...override.topbar },
    ambient: { ...base.ambient, ...override.ambient },
    greeting: { ...base.greeting, ...override.greeting },
  };
}
