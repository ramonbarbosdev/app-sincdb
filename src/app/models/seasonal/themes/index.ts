import { SeasonalThemeDefinition, SeasonalThemeId } from '../seasonal.types';
import { NATAL_THEME } from './natal.theme';
import { ANO_NOVO_THEME } from './ano-novo.theme';
import { PASCOA_THEME } from './pascoa.theme';
import { FESTA_JUNINA_THEME } from './festa-junina.theme';
import { PRIMAVERA_THEME } from './primavera.theme';
import { HALLOWEEN_THEME } from './halloween.theme';
import { DIAS_DE_CHUVA_THEME } from './dias-de-chuva.theme';
/** Ordem de prioridade quando janelas se sobrepõem */
export const SEASONAL_THEME_PRIORITY: SeasonalThemeId[] = [
  'natal',
  'ano-novo',
  'halloween',
  'festa-junina',
  'pascoa',
  'primavera',
  'dias-de-chuva',
];

export const SEASONAL_THEMES: SeasonalThemeDefinition[] = [
  NATAL_THEME,
  ANO_NOVO_THEME,
  PASCOA_THEME,
  FESTA_JUNINA_THEME,
  PRIMAVERA_THEME,
  HALLOWEEN_THEME,
  DIAS_DE_CHUVA_THEME,
];

export {
  NATAL_THEME,
  ANO_NOVO_THEME,
  PASCOA_THEME,
  FESTA_JUNINA_THEME,
  PRIMAVERA_THEME,
  HALLOWEEN_THEME,
  DIAS_DE_CHUVA_THEME,
};
