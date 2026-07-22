import { createSlots, SeasonalThemeDefinition } from '../seasonal.types';

/** Personalize defaults do Natal aqui. Visual dos slots em theme/seasonal/_effects-*.scss */
export const NATAL_THEME: SeasonalThemeDefinition = {
  id: 'natal',
  label: 'Natal',
  description: 'Gorro na logo, neve sutil no topbar e saudação natalina.',
  accent: '#c45c48',
  glow: 'rgba(196, 92, 72, 0.28)',
  greeting: 'Boas festas — obrigado por sincronizar conosco neste ano.',
  windows: [{ startMonth: 12, startDay: 1, endMonth: 12, endDay: 26 }],
  slots: createSlots({
    logo: { enabled: true, overlay: 'hat' },
    topbar: { enabled: true, accent: '#c45c48' },
    ambient: { enabled: true, effect: 'snow' },
    greeting: {
      enabled: true,
      message: 'Boas festas — obrigado por sincronizar conosco neste ano.',
      icon: 'pi pi-gift',
    },
  }),
};
