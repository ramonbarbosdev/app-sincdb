import { Injectable, inject, signal } from '@angular/core';
import { BaseService } from '../../../services/base.service';
import {
  DiagramFlowConnection,
  DiagramFlowNode,
  DiagramFlowPoint,
  SyncDiagramContext,
  SyncDiagramItem,
  SyncDiagramKind,
  SyncDiagramMode,
  SyncDiagramNodeData,
} from '../models/sync-diagram.model';

const DEFAULT_POSITIONS: Record<string, DiagramFlowPoint> = {
  'node-bases': { x: 80, y: 100 },
};

const HORIZONTAL_GAP = 320;

@Injectable()
export class SyncDiagramStateService {
  private baseService = inject(BaseService);

  readonly syncMode = signal<SyncDiagramMode>('estrutura');
  readonly flowNodes = signal<DiagramFlowNode[]>([]);
  readonly flowConnections = signal<DiagramFlowConnection[]>([]);
  readonly loadingInitial = signal(true);
  readonly selection = signal<SyncDiagramContext>({});

  private bases: SyncDiagramItem[] = [];
  private schemaCache = new Map<string, SyncDiagramItem[]>();
  private tableCache = new Map<string, SyncDiagramItem[]>();

  private nodeMeta = new Map<string, SyncDiagramNodeData>();
  private filters = new Map<string, string>();
  private loadingNodes = new Map<string, boolean>();
  private positions = new Map<string, DiagramFlowPoint>();

  private basesNodeId = 'node-bases';
  private schemasNodeId?: string;
  private tablesNodeId?: string;

  init(): void {
    this.loadingInitial.set(true);
    this.baseService.findAll('sincronizacao/bases/').subscribe({
      next: (res) => {
        this.bases = (res as string[]).map((name) => ({ id: name, label: name }));
        this.filters.set(this.basesNodeId, '');
        this.rebuildGraph();
        this.loadingInitial.set(false);
      },
      error: () => {
        this.bases = [];
        this.rebuildGraph();
        this.loadingInitial.set(false);
      },
    });
  }

  setSyncMode(mode: SyncDiagramMode): void {
    this.syncMode.set(mode);
  }

  setFilter(nodeId: string, value: string): void {
    this.filters.set(nodeId, value);
    this.rebuildGraph();
  }

  updateNodePosition(nodeId: string, position: DiagramFlowPoint): void {
    this.positions.set(nodeId, { x: position.x, y: position.y });
  }

  selectItem(kind: SyncDiagramKind, itemId: string, context: SyncDiagramContext): void {
    if (kind === 'bases') {
      this.selection.set({ base: itemId });
      this.spawnSchemas(itemId);
      return;
    }

    if (kind === 'schemas') {
      const base = context.base ?? this.selection().base;
      if (!base) return;
      this.selection.set({ base, esquema: itemId });
      this.spawnTables(base, itemId);
      return;
    }

    if (kind === 'tables') {
      const current = this.selection();
      const tabela = current.tabela === itemId ? undefined : itemId;
      this.selection.set({
        base: current.base,
        esquema: current.esquema,
        tabela,
      });
      this.rebuildGraph();
    }
  }

  closeChildren(kind: SyncDiagramKind): void {
    if (kind === 'bases') {
      this.schemasNodeId = undefined;
      this.tablesNodeId = undefined;
      this.selection.set({});
    } else if (kind === 'schemas') {
      this.tablesNodeId = undefined;
      const sel = this.selection();
      this.selection.set({ base: sel.base });
    }
    this.rebuildGraph();
  }

  filteredItems(nodeId: string): SyncDiagramItem[] {
    const meta = this.nodeMeta.get(nodeId);
    if (!meta) return [];
    const q = (this.filters.get(nodeId) ?? '').trim().toLowerCase();
    if (!q) return meta.items;
    return meta.items.filter((i) => i.label.toLowerCase().includes(q));
  }

  private spawnSchemas(base: string): void {
    this.schemasNodeId = `node-schemas-${base}`;
    this.tablesNodeId = undefined;
    this.selection.set({ base });
    this.ensurePosition(this.schemasNodeId, this.nextPosition(this.basesNodeId));

    const cached = this.schemaCache.get(base);
    if (cached) {
      this.rebuildGraph();
      return;
    }

    this.loadingNodes.set(this.schemasNodeId, true);
    this.rebuildGraph();

    this.baseService.findAll(`sincronizacao/base/esquema/${base}`).subscribe({
      next: (res) => {
        const items = (res as string[]).map((name) => ({ id: name, label: name }));
        this.schemaCache.set(base, items);
        this.loadingNodes.set(this.schemasNodeId!, false);
        this.rebuildGraph();
      },
      error: () => {
        this.schemaCache.set(base, []);
        this.loadingNodes.set(this.schemasNodeId!, false);
        this.rebuildGraph();
      },
    });
  }

  private spawnTables(base: string, esquema: string): void {
    this.tablesNodeId = `node-tables-${base}-${esquema}`;
    this.ensurePosition(this.tablesNodeId, this.nextPosition(this.schemasNodeId!));
    const key = `${base}|${esquema}`;
    const cached = this.tableCache.get(key);

    if (cached) {
      this.rebuildGraph();
      return;
    }

    this.loadingNodes.set(this.tablesNodeId, true);
    this.rebuildGraph();

    this.baseService.findAll(`sincronizacao/base/tabela/${base}/${esquema}`).subscribe({
      next: (res) => {
        const items = (res as string[]).map((name) => ({ id: name, label: name }));
        this.tableCache.set(key, items);
        this.loadingNodes.set(this.tablesNodeId!, false);
        this.rebuildGraph();
      },
      error: () => {
        this.tableCache.set(key, []);
        this.loadingNodes.set(this.tablesNodeId!, false);
        this.rebuildGraph();
      },
    });
  }

  private nextPosition(fromNodeId: string): DiagramFlowPoint {
    const from = this.positions.get(fromNodeId) ?? DEFAULT_POSITIONS[fromNodeId] ?? { x: 80, y: 100 };
    return { x: from.x + HORIZONTAL_GAP, y: from.y };
  }

  private ensurePosition(nodeId: string, fallback: DiagramFlowPoint): void {
    if (!this.positions.has(nodeId)) {
      this.positions.set(nodeId, { ...fallback });
    }
  }

  private getPosition(nodeId: string, fallback: DiagramFlowPoint): DiagramFlowPoint {
    const stored = this.positions.get(nodeId);
    if (stored) return { ...stored };
    const point = { ...fallback };
    this.positions.set(nodeId, point);
    return point;
  }

  private connectorIds(nodeId: string): { source: string; target: string } {
    return { source: `${nodeId}::out`, target: `${nodeId}::in` };
  }

  private rebuildGraph(): void {
    this.nodeMeta.clear();
    const nodes: DiagramFlowNode[] = [];
    const connections: DiagramFlowConnection[] = [];
    const sel = this.selection();

    const basesMeta: SyncDiagramNodeData = {
      nodeId: this.basesNodeId,
      kind: 'bases',
      title: 'Bases',
      items: this.bases,
      loading: false,
      filter: this.filters.get(this.basesNodeId) ?? '',
      selectedItemId: sel.base,
      context: {},
      itemCount: this.bases.length,
    };
    this.nodeMeta.set(this.basesNodeId, basesMeta);
    nodes.push(this.createFlowNode(this.basesNodeId, basesMeta, DEFAULT_POSITIONS['node-bases']));

    if (sel.base && this.schemasNodeId) {
      const schemas = this.schemaCache.get(sel.base) ?? [];
      const schemasMeta: SyncDiagramNodeData = {
        nodeId: this.schemasNodeId,
        kind: 'schemas',
        title: 'Schemas',
        subtitle: sel.base,
        items: schemas,
        loading: this.loadingNodes.get(this.schemasNodeId) ?? false,
        filter: this.filters.get(this.schemasNodeId) ?? '',
        selectedItemId: sel.esquema,
        context: { base: sel.base },
        itemCount: schemas.length,
      };
      this.nodeMeta.set(this.schemasNodeId, schemasMeta);
      const schemaPos = this.getPosition(this.schemasNodeId, this.nextPosition(this.basesNodeId));
      nodes.push(this.createFlowNode(this.schemasNodeId, schemasMeta, schemaPos));
      connections.push(
        this.createConnection(this.basesNodeId, this.schemasNodeId, !!sel.base && !!sel.esquema)
      );
    }

    if (sel.base && sel.esquema && this.tablesNodeId) {
      const key = `${sel.base}|${sel.esquema}`;
      const tables = this.tableCache.get(key) ?? [];
      const tablesMeta: SyncDiagramNodeData = {
        nodeId: this.tablesNodeId,
        kind: 'tables',
        title: 'Tabelas',
        subtitle: `${sel.base}.${sel.esquema}`,
        items: tables,
        loading: this.loadingNodes.get(this.tablesNodeId) ?? false,
        filter: this.filters.get(this.tablesNodeId) ?? '',
        selectedItemId: sel.tabela,
        context: { base: sel.base, esquema: sel.esquema },
        itemCount: tables.length,
      };
      this.nodeMeta.set(this.tablesNodeId, tablesMeta);
      const tablePos = this.getPosition(this.tablesNodeId, this.nextPosition(this.schemasNodeId!));
      nodes.push(this.createFlowNode(this.tablesNodeId, tablesMeta, tablePos));
      connections.push(
        this.createConnection(this.schemasNodeId!, this.tablesNodeId, !!sel.tabela)
      );
    }

    this.flowNodes.set(nodes);
    this.flowConnections.set(connections);
  }

  private createFlowNode(
    id: string,
    meta: SyncDiagramNodeData,
    defaultPosition: DiagramFlowPoint
  ): DiagramFlowNode {
    const connectors = this.connectorIds(id);
    return {
      id,
      meta,
      position: this.getPosition(id, defaultPosition),
      sourceConnectorId: connectors.source,
      targetConnectorId: connectors.target,
    };
  }

  private createConnection(
    sourceNodeId: string,
    targetNodeId: string,
    active: boolean
  ): DiagramFlowConnection {
    const source = this.connectorIds(sourceNodeId);
    const target = this.connectorIds(targetNodeId);
    return {
      id: `edge-${sourceNodeId}-${targetNodeId}`,
      sourceId: source.source,
      targetId: target.target,
      active,
    };
  }
}
