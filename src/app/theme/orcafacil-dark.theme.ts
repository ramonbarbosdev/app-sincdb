import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

export const OrcaFacilDark = definePreset(Aura, {
  primitive: {
    colorScheme: 'dark',
  },
  semantic: {
    primary: {
      50: '#DBEAFE',
      100: '#BFDBFE',
      200: '#93C5FD',
      300: '#60A5FA',
      400: '#3B82F6',
      500: '#2563EB', // COR PRINCIPAL (azul OrçaFácil)
      600: '#1D4ED8',
      700: '#1E40AF',
      800: '#1E3A8A',
      900: '#1E3A8A',
    },
    surface: {
      0: '#0B0F19', // background mais limpo e moderno
      50: '#111827', // painéis
      100: '#1F2937', // inputs/cards
      200: '#27303F', // bordas leves
      300: '#374151',
      400: '#4B5563',
      500: '#6B7280',
      600: '#9CA3AF',
      700: '#D1D5DB',
      800: '#E5E7EB',
      900: '#F3F4F6',
    },
    success: {
      500: '#10B981',
      600: '#059669',
    },
    warning: {
      500: '#F59E0B',
      600: '#D97706',
    },
    danger: {
      500: '#EF4444',
      600: '#DC2626',
    },
  },
  // Ajustes visuais opcionais
});