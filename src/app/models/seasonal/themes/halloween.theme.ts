import { createSlots, SeasonalThemeDefinition } from '../seasonal.types';

export const HALLOWEEN_THEME: SeasonalThemeDefinition = {
  id: 'halloween',
  label: 'Halloween',
  description: 'Laranja e roxo discretos, sem perder legibilidade.',
  accent: '#e07a3d',
  glow: 'rgba(224, 122, 61, 0.28)',
  greeting: 'Nada assusta mais do que schema desatualizado.',
  windows: [{ startMonth: 10, startDay: 25, endMonth: 11, endDay: 2 }],
  slots: createSlots({
    logo: { enabled: true, overlay: 'badge' },
    topbar: { enabled: true, accent: '#e07a3d' },
    ambient: { enabled: true, effect: 'sparkle' },
    greeting: {
      enabled: true,
      message: 'Nada assusta mais do que schema desatualizado.',
      icon: 'pi pi-moon',
    },
  }),
};
