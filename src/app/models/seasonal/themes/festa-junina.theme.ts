import { createSlots, SeasonalThemeDefinition } from '../seasonal.types';

export const FESTA_JUNINA_THEME: SeasonalThemeDefinition = {
  id: 'festa-junina',
  label: 'Festa Junina',
  description: 'Bandeirinhas micro no topo da aplicação.',
  accent: '#e2a03f',
  glow: 'rgba(226, 160, 63, 0.28)',
  greeting: 'Junho chegou — mantenha Cloud e Local em sintonia.',
  windows: [{ startMonth: 6, startDay: 1, endMonth: 6, endDay: 30 }],
  slots: createSlots({
    logo: { enabled: false, overlay: 'none' },
    topbar: { enabled: true, accent: '#e2a03f' },
    ambient: { enabled: true, effect: 'flags' },
    greeting: {
      enabled: true,
      message: 'Junho chegou — mantenha Cloud e Local em sintonia.',
      icon: 'pi pi-sun',
    },
  }),
};
