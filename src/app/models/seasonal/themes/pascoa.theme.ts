import { createSlots, SeasonalThemeDefinition } from '../seasonal.types';

export const PASCOA_THEME: SeasonalThemeDefinition = {
  id: 'pascoa',
  label: 'Páscoa',
  description: 'Acentos pastéis e mensagem de renovação.',
  accent: '#7eb8a2',
  glow: 'rgba(126, 184, 162, 0.28)',
  greeting: 'Tempo de renovação — boa hora de alinhar estruturas.',
  windows: [{ startMonth: 3, startDay: 20, endMonth: 4, endDay: 25 }],
  slots: createSlots({
    logo: { enabled: false, overlay: 'none' },
    topbar: { enabled: true, accent: '#7eb8a2' },
    ambient: { enabled: true, effect: 'petals' },
    greeting: {
      enabled: true,
      message: 'Tempo de renovação — boa hora de alinhar estruturas.',
      icon: 'pi pi-heart',
    },
  }),
};
