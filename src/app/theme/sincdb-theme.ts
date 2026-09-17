import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { sincdbPalette } from './sincdb-palette';

export const SyncDBTheme = definePreset(Aura, {
  primitive: {
    colorScheme: 'dark',
  },
  semantic: {
    primary: { ...sincdbPalette.primary },
    surface: { ...sincdbPalette.surface },
    text: { ...sincdbPalette.text },
    border: { ...sincdbPalette.border },
    success: {
      500: sincdbPalette.feedback.success,
    },
    warning: {
      500: sincdbPalette.feedback.warning,
    },
    danger: {
      500: sincdbPalette.feedback.danger,
    },
  },
});
