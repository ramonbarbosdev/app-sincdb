import { Injectable } from '@angular/core';
import {
  DiagramFlowPoint,
  SyncDiagramContext,
  SyncDiagramMode,
  SyncDiagramTreeLayout,
} from '../models/sync-diagram.model';

const STORAGE_KEY = 'sync-diagram-layout-v1';

export interface SyncDiagramPersistedLayout {
  version: 1;
  syncMode: SyncDiagramMode;
  selection: SyncDiagramContext;
  filters: Record<string, string>;
  positions: Record<string, DiagramFlowPoint>;
  openSchemaListBases?: string[];
  openSchemaBoxes?: string[];
  openTablesKeys?: string[];
  treeLayout?: SyncDiagramTreeLayout;
}

@Injectable()
export class SyncDiagramLayoutPersistenceService {
  load(): SyncDiagramPersistedLayout | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SyncDiagramPersistedLayout;
      if (parsed?.version !== 1) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  save(layout: SyncDiagramPersistedLayout): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch {
      // quota or private mode — ignore
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
