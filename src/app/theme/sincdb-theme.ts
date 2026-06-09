import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

export const SyncDBTheme = definePreset(Aura, {
  primitive: {
    colorScheme: 'dark',
  },

  semantic: {
    primary: {
      50: '#ECFDF5',
      100: '#D1FAE5',
      200: '#A7F3D0',
      300: '#6EE7B7',
      400: '#34D399',
      500: '#10B981', // COR PRINCIPAL
      600: '#059669',
      700: '#047857',
      800: '#065F46',
      900: '#064E3B',
    },

    surface: {
      0: '#0B0F14', // Fundo principal
      50: '#0F141B',
      100: '#111827', // Cards
      200: '#1A2332', // Hover
      300: '#243041',
    },

    text: {
      primary: '#F8FAFC',
      secondary: '#94A3B8',
      disabled: '#64748B',
    },

    border: {
      default: '#233044',
    },

    success: {
      500: '#22C55E',
    },

    warning: {
      500: '#F59E0B',
    },

    danger: {
      500: '#EF4444',
    },

    info: {
      500: '#38BDF8',
    },
  },
});