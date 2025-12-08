import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const PurpleTheme = definePreset(Aura, {
  ...Aura,
  semantic: {
    ...Aura.semantic,

    colorScheme: {
      light: {
      
      },

      dark: {
       
      },
    },
  },
});

export default PurpleTheme;
