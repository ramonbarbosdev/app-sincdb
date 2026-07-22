import {
  SeasonalThemeDefinition,
  SeasonalThemeId,
} from './seasonal.types';
import { SEASONAL_THEMES, SEASONAL_THEME_PRIORITY } from './themes';

export * from './seasonal.types';
export * from './themes';

export function getSeasonalTheme(id: SeasonalThemeId): SeasonalThemeDefinition | undefined {
  return SEASONAL_THEMES.find((theme) => theme.id === id);
}

export function isDateInWindows(
  date: Date,
  windows: SeasonalThemeDefinition['windows']
): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const key = month * 100 + day;

  return windows.some((window) => {
    const start = window.startMonth * 100 + window.startDay;
    const end = window.endMonth * 100 + window.endDay;
    if (start <= end) {
      return key >= start && key <= end;
    }
    return key >= start || key <= end;
  });
}

export function resolveAutoTheme(date = new Date()): SeasonalThemeId {
  for (const id of SEASONAL_THEME_PRIORITY) {
    const theme = getSeasonalTheme(id);
    if (theme && isDateInWindows(date, theme.windows)) {
      return id;
    }
  }
  return 'none';
}
