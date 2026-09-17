import { sincdbPalette } from './sincdb-palette';

const CSS_TOKEN_MAP: Record<string, string> = {
  '--sincdb-brand': sincdbPalette.brand.primary,
  '--sincdb-brand-hover': sincdbPalette.brand.primaryHover,
  '--sincdb-accent': sincdbPalette.brand.accent,
  '--sincdb-cloud': sincdbPalette.environments.cloud,
  '--sincdb-local': sincdbPalette.environments.local,
  '--sincdb-feedback-success': sincdbPalette.feedback.success,
  '--sincdb-feedback-warning': sincdbPalette.feedback.warning,
  '--sincdb-feedback-danger': sincdbPalette.feedback.danger,
  '--sincdb-surface-0': sincdbPalette.surface[0],
  '--sincdb-text-primary': sincdbPalette.text.primary,
  '--sincdb-text-secondary': sincdbPalette.text.secondary,
  '--sincdb-diagram-data-teal': sincdbPalette.diagram.dataTeal,
  '--sincdb-diagram-status-created': sincdbPalette.diagram.status.created,
  '--sincdb-diagram-status-altered': sincdbPalette.diagram.status.altered,
  '--sincdb-diagram-status-linked': sincdbPalette.diagram.status.linked,
  '--sincdb-diagram-status-done': sincdbPalette.diagram.status.done,
  '--sincdb-diagram-status-error': sincdbPalette.diagram.status.error,
  '--sincdb-console-border-mix': sincdbPalette.diagram.console.borderMix,
  '--sincdb-console-header-base': sincdbPalette.diagram.console.headerBase,
};

/** Injeta tokens de cor no `:root` antes do bootstrap (SCSS e componentes usam `var(--sincdb-*)`). */
export function applySincdbCssTokens(): void {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(CSS_TOKEN_MAP)) {
    root.style.setProperty(name, value);
  }
}
