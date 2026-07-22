import { createSlots, SeasonalThemeDefinition } from '../seasonal.types';

export const DIAS_DE_CHUVA_THEME: SeasonalThemeDefinition = {
  id: 'dias-de-chuva',
  label: 'Dias de Chuva',
  description: 'Visual discreto para dias chuvosos e céu nublado.',
  accent: '#5C7A99',
  glow: 'rgba(92, 122, 153, 0.28)',
  greeting: 'Dias de chuva por aqui — bom trabalho, mesmo com o céu cinza.',
  windows: [{ startMonth: 7, startDay: 22, endMonth: 8, endDay: 5 }],
  slots: createSlots({
    logo: { enabled: true, overlay: 'hat' },
    topbar: { enabled: true, accent: '#5C7A99' },
    ambient: { enabled: true, },
    greeting: {
      enabled: true,
      message: 'Dias de chuva por aqui — bom trabalho, mesmo com o céu cinza.',
      icon: 'pi pi-cloud',
    },
  }),
};