/**
 * Paleta oficial do SyncDB — altere as cores aqui.
 *
 * O tema PrimeNG (`sincdb-theme.ts`) e as variáveis CSS globais
 * (`apply-sincdb-css-tokens.ts`) são derivados deste arquivo.
 */
const brand = {
  /** Azul marca — botões, links, ícone */
  primary: '#2B55FF',
  /** Hover de ações primárias */
  primaryHover: '#2348E0',
  /** Azul mais claro — destaques e ênfase em fundos escuros */
  accent: '#5C7AFF',
} as const;

export const sincdbPalette = {
  brand,
  /** Escala PrimeNG derivada da marca */
  primary: {
    50: '#eef2ff',
    100: '#dde6ff',
    200: '#b8c9ff',
    300: '#8aa6ff',
    400: brand.accent,
    500: brand.primary,
    600: brand.primaryHover,
    700: '#1c3ab8',
    800: '#152d8f',
    900: '#0f2169',
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
    /** Cloud na UI usa a cor de marca */
    cloud: brand.primary,
    local: '#2cb67d',
  },
  seasonal: {
    defaultGlow: 'rgba(43, 85, 255, 0.28)',
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
      borderMix: '#1a2238',
      headerBase: '#1e2438',
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
