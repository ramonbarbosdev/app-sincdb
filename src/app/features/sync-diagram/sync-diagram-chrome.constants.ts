/** Tooltip compartilhado do chrome do diagrama (rail + top bar). */
export const SYNC_DIAGRAM_TOOLTIP = {
  styleClass: 'sync-diagram-tooltip',
  showDelay: 400,
  hideDelay: 80,
} as const;

export const SYNC_DIAGRAM_ZOOM = {
  minimum: 0.4,
  maximum: 4,
  step: 0.1,
} as const;

export const SYNC_DIAGRAM_NODE_SIZE = {
  minScale: 0.75,
  maxScale: 2.5,
  stepFactor: 0.12,
} as const;
