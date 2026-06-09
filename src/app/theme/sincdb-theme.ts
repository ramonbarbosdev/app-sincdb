import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

export const SyncDBTheme = definePreset(Aura, {
  primitive: {
    colorScheme: 'dark',
  },
  semantic: {
    primary: {
      50: '#efeaff',
      100: '#d8c9ff',
      200: '#b08cff',
      300: '#9366ff',
      400: '#8552ff',
      500: '#7f5af0', // BOTÕES / COR PRINCIPAL
      600: '#6b46d9',
      700: '#5533b4',
      800: '#3d1f80',
      900: '#2a1359',
    },
    surface: {
      0: '#16161a', // FUNDO GERAL
      50: '#1a1a1d',
      100: '#1f1f23', // CONTÊINER / CARDS
      200: '#212126',
    },
    text: {
      primary: '#fffffe', // HEADLINE
      secondary: '#94a1b2', // PARAGRAPH
      disabled: '#72757e',
    },
    border: {
      default: '#010101', // Stroke
    },
    success: {
      500: '#2cb67d',
    },
    warning: {
      500: '#f4d35e',
    },
    danger: {
      500: '#ef3e36',
    },
  },
});