import { createSlots, SeasonalThemeDefinition } from '../seasonal.types';

export const ANO_NOVO_THEME: SeasonalThemeDefinition = {
  id: 'ano-novo',
  label: 'Ano Novo',
  description: 'Mensagem de boas-vindas e brilho suave.',
  accent: '#7f5af0',
  glow: 'rgba(127, 90, 240, 0.28)',
  greeting: 'Bom ano novo — que as sincronizações fluam.',
  windows: [
    { startMonth: 12, startDay: 27, endMonth: 12, endDay: 31 },
    { startMonth: 1, startDay: 1, endMonth: 1, endDay: 7 },
  ],
  slots: createSlots({
    logo: { enabled: true, overlay: 'badge' },
    topbar: { enabled: true, accent: '#7f5af0' },
    ambient: { enabled: true, effect: 'sparkle' },
    greeting: {
      enabled: true,
      message: 'Bom ano novo — que as sincronizações fluam.',
      icon: 'pi pi-star',
    },
  }),
};
