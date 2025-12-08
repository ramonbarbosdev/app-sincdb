import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const ZincTheme = definePreset(Aura, {
  ...Aura,
  semantic: {
    ...Aura.semantic,

    zinc: {
      50: '#f0f7e6',
      100: '#d9ebbf',
      200: '#c1df99',
      300: '#aad373',
      400: '#95c754',
      500: '#aed143',
      600: '#88a831',
      700: '#6b8726',
      800: '#4e621a',
      900: '#333e0f',
      950: '#1a1f07',
    },

    primary: {
      50: '#f0f7e6',
      100: '#d9ebbf',
      200: '#c1df99',
      300: '#aad373',
      400: '#95c754',
      500: '#aed143',
      600: '#88a831',
      700: '#6b8726',
      800: '#4e621a',
      900: '#333e0f',
      950: '#1a1f07',
    },

    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '{zinc.50}',
          100: '{zinc.100}',
          200: '{zinc.200}',
          300: '{zinc.300}',
          400: '{zinc.400}',
          500: '{zinc.500}',
          600: '{zinc.600}',
          700: '{zinc.700}',
          800: '{zinc.800}',
          900: '{zinc.900}',
          950: '{zinc.950}',
        },
        primary: {
          color: '{primary.500}',
          inverseColor: '#ffffff',
          hoverColor: '{primary.600}',
          activeColor: '{primary.700}',
        },
      },
      dark: {
        surface: {
          0: '#000000',
          50: '{zinc.950}',
          100: '{zinc.900}',
          200: '{zinc.800}',
          300: '{zinc.700}',
          400: '{zinc.600}',
          500: '{zinc.500}',
          600: '{zinc.400}',
          700: '{zinc.300}',
          800: '{zinc.200}',
          900: '{zinc.100}',
          950: '{zinc.50}',
        },
        primary: {
          color: '{primary.500}',
          inverseColor: '#ffffff',
          hoverColor: '{primary.600}',
          activeColor: '{primary.700}',
        },
      },
    },
  },
});

export default ZincTheme;
