/**
 * Paleta oficial do SyncDB — altere as cores aqui.
 *
 * O tema PrimeNG (`sincdb-theme.ts`) e as variáveis CSS globais
 * (`apply-sincdb-css-tokens.ts`) são derivados deste arquivo.
 */
const brand = {
  /** Azul petróleo — botões, links, marca */
  primary: '#155E75',
  /** Hover de ações primárias */
  primaryHover: '#0E7490',
  /** Ciano elétrico — destaques, cloud, ênfase visual */
  accent: '#22D3EE',
} as const;

export const sincdbPalette = {
  brand,
  /** Escala PrimeNG derivada da marca */
  primary: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: brand.accent,
    500: brand.primary,
    600: brand.primaryHover,
    700: '#0c5a6e',
    800: '#094555',
    900: '#063544',
  },
  surface: {
    0: '#16161a',
    50: '#1a1a1d',
    100: '#1f1f23',
    200: '#212126',
  },
  text: {
    primary: '#fffffe',
    secondary: '#94a1b2',
    disabled: '#72757e',
  },
  border: {
    default: '#010101',
  },
  feedback: {
    success: '#2cb67d',
    warning: '#f97316',
    danger: '#ef3e36',
  },
  environments: {
    /** Cloud na UI usa o destaque ciano; local permanece verde */
    cloud: brand.accent,
    local: '#2cb67d',
  },
  seasonal: {
    defaultGlow: 'rgba(34, 211, 238, 0.28)',
  },
  diagram: {
    dataTeal: brand.accent,
    status: {
      created: '#22c55e',
      altered: '#f59e0b',
      linked: '#6366f1',
      done: '#16a34a',
      error: '#ef4444',
    },
    console: {
      borderMix: '#1a2830',
      headerBase: '#1e2a32',
    },
  },
} as const;

export function sincdbBrandColor(): string {
  return sincdbPalette.brand.primary;
}

export function sincdbBrandHoverColor(): string {
  return sincdbPalette.brand.primaryHover;
}

export function sincdbAccentColor(): string {
  return sincdbPalette.brand.accent;
}

export function sincdbSeasonalDefaultAccent(): string {
  return sincdbBrandColor();
}
