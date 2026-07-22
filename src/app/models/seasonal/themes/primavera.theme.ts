import { createSlots, SeasonalThemeDefinition } from '../seasonal.types';

export const PRIMAVERA_THEME: SeasonalThemeDefinition = {
  id: 'primavera',
  label: 'Primavera',
  description: 'Tons suaves e pétalas discretas.',
  accent: '#6db58a',
  glow: 'rgba(109, 181, 138, 0.25)',
  greeting: 'Primavera no SyncDB — ambiente mais leve.',
  windows: [{ startMonth: 9, startDay: 22, endMonth: 12, endDay: 20 }],
  slots: createSlots({
    logo: { enabled: false, overlay: 'none' },
    topbar: { enabled: true, accent: '#6db58a' },
    ambient: { enabled: true, effect: 'petals' },
    greeting: {
      enabled: true,
      message: 'Primavera no SyncDB — ambiente mais leve.',
      icon: 'pi pi-verified',
    },
  }),
};
