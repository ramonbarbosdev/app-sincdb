import { Injectable, inject, signal } from '@angular/core';
import { EstruturaResponse } from '../../../components/estrutura-preview/estrutura-preview';
import { BaseService } from '../../../services/base.service';
import {
  ColumnVisualState,
  DiagramFlowConnection,
  DiagramFlowNode,
  DiagramFlowPoint,
  ErdEdge,
  ErdImpactZone,
  ErdTableNode,
  ImpactCategoryChip,
  ImpactChipKey,
  SyncDiagramContext,
  SyncDiagramItem,
  SyncDiagramKind,
  SyncDiagramMode,
  SyncDiagramNodeData,
  SyncOperation,
  TableVisualStatus,
  TabelaAfetadaDTO,
} from '../models/sync-diagram.model';
import { SyncDiagramLayoutPersistenceService } from './sync-diagram-layout-persistence.service';
import { SyncDiagramLayoutService } from './sync-diagram-layout.service';

const DEFAULT_POSITIONS: Record<string, DiagramFlowPoint> = {
  'node-bases': { x: 80, y: 100 },
};

const HORIZONTAL_GAP = 320;
const OPERATION_GAP = 320;
const ERD_ORIGIN_OFFSET_X = 280;

@Injectable()
export class SyncDiagramStateService {
  private baseService = inject(BaseService);
  private layout = inject(SyncDiagramLayoutService);
  private persistence = inject(SyncDiagramLayoutPersistenceService);

  readonly syncMode = signal<SyncDiagramMode>('estrutura');
  readonly flowNodes = signal<DiagramFlowNode[]>([]);
  readonly flowConnections = signal<DiagramFlowConnection[]>([]);
  readonly loadingInitial = signal(true);
  readonly selection = signal<SyncDiagramContext>({});
  readonly operations = signal<SyncOperation[]>([]);

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

  private erdTables = new Map<string, ErdTableNode>();
  private erdEdges = new Map<string, ErdEdge>();
  private activeOperationId?: string;
  private persistTimer?: ReturnType<typeof setTimeout>;

  init(): void {
    this.applyStoredLayout();
    this.loadingInitial.set(true);
    this.baseService.findAll('sincronizacao/bases/').subscribe({
      next: (res) => {
        this.bases = (res as string[]).map((name) => ({ id: name, label: name }));
        if (!this.filters.has(this.basesNodeId)) {
          this.filters.set(this.basesNodeId, '');
        }
        this.restoreDrillDownFromSelection();
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
    this.persistSoon();
  }

  setFilter(nodeId: string, value: string): void {
    this.filters.set(nodeId, value);
    this.rebuildGraph();
    this.persistSoon();
  }

  updateNodePosition(nodeId: string, position: DiagramFlowPoint): void {
    const point = { x: position.x, y: position.y };
    this.positions.set(nodeId, point);

    if (nodeId.startsWith('erd-') && !nodeId.startsWith('erd-zone-')) {
      const table = this.erdTables.get(nodeId);
      if (table) {
        const op = this.getOperation(table.operationId);
        if (op?.context.base && op?.context.esquema) {
          const grafoId = nodeId.replace(`erd-${table.operationId}-`, '');
          this.positions.set(
            this.erdStableKey(op.context.base, op.context.esquema, grafoId),
            point
          );
        }
        this.rebuildGraph();
      }
    }

    this.persistSoon();
  }

  spawnOperation(operation: SyncOperation): void {
    this.operations.update((list) => {
      const without = list.filter((o) => o.id !== operation.id);
      return [...without, operation];
    });
    this.activeOperationId = operation.id;
    this.closeAllOperationDetails(operation.id);
    const opNodeId = this.operationNodeId(operation.id);
    const anchor = this.lastSelectorNodeId();
    const anchorPos = this.positions.get(anchor) ?? DEFAULT_POSITIONS[anchor] ?? { x: 80, y: 100 };
    this.positions.set(opNodeId, { x: anchorPos.x + OPERATION_GAP, y: anchorPos.y });
    this.rebuildGraph();
  }

  patchOperation(operationId: string, patch: Partial<SyncOperation>): void {
    this.operations.update((list) =>
      list.map((o) => (o.id === operationId ? { ...o, ...patch } : o))
    );
    this.rebuildGraph();
  }

  getOperation(operationId: string): SyncOperation | undefined {
    return this.operations().find((o) => o.id === operationId);
  }

  toggleOperationDetail(operationId: string): void {
    const op = this.getOperation(operationId);
    if (!op) return;
    const opening = !op.detailOpen;
    this.closeAllOperationDetails(opening ? operationId : undefined);
    this.patchOperation(operationId, { detailOpen: opening });
    if (!opening) {
      this.clearErdForOperation(operationId);
    }
  }

  closeOperationDetail(operationId: string): void {
    this.patchOperation(operationId, { detailOpen: false });
    this.clearErdForOperation(operationId);
  }

  openOperationDetail(operationId: string): void {
    this.closeAllOperationDetails(operationId);
    this.patchOperation(operationId, { detailOpen: true });
  }

  findErdTableNodeId(operationId: string, tableName: string): string | undefined {
    const key = this.normalizeTableKey(tableName);
    return this.findErdTableByKey(operationId, key)?.id;
  }

  setErdGraph(operationId: string, tables: ErdTableNode[], edges: ErdEdge[]): void {
    this.clearErdForOperation(operationId);
    tables.forEach((t) => this.erdTables.set(t.id, t));
    edges.forEach((e) => this.erdEdges.set(e.id, e));

    const opNodeId = this.operationNodeId(operationId);
    const opPos = this.positions.get(opNodeId) ?? { x: 1040, y: 100 };
    const op = this.getOperation(operationId);
    const base = op?.context.base;
    const esquema = op?.context.esquema;
    const layoutPositions = this.layout.layoutErd(
      tables.map((t) => ({ id: t.id })),
      { x: opPos.x + ERD_ORIGIN_OFFSET_X, y: opPos.y }
    );
    layoutPositions.forEach((pos, id) => {
      let resolved = pos;
      if (base && esquema) {
        const grafoId = id.replace(`erd-${operationId}-`, '');
        const stored = this.positions.get(this.erdStableKey(base, esquema, grafoId));
        if (stored) resolved = stored;
      }
      this.positions.set(id, resolved);
    });
    this.rebuildGraph();
  }

  patchErdTable(tableId: string, patch: Partial<ErdTableNode>): void {
    const current = this.erdTables.get(tableId);
    if (!current) return;
    this.erdTables.set(tableId, { ...current, ...patch });
    this.rebuildGraph();
  }

  applyEstruturaVisuals(operationId: string, response: EstruturaResponse): void {
    const tableStatus = new Map<string, TableVisualStatus>();
    for (const cat of response.categorias ?? []) {
      const titulo = cat.titulo ?? '';
      for (const item of cat.items ?? []) {
        const key = this.normalizeTableKey(item.objeto);
        if (titulo.includes('Criação')) tableStatus.set(key, 'created');
        else if (titulo.includes('Alterações')) tableStatus.set(key, 'altered');
        else if (titulo.includes('Chaves')) tableStatus.set(key, 'linked');
      }
    }
    this.applyTableStatusMap(operationId, tableStatus, true);
    this.markSyncedTablesAfterVerify(operationId);

    for (const edge of this.erdEdgesForOperation(operationId)) {
      if (tableStatus.size > 0) {
        this.erdEdges.set(edge.id, { ...edge, status: 'done' });
      }
    }
    this.rebuildGraph();
  }

  applyDadosVisuals(operationId: string, tabelas: TabelaAfetadaDTO[]): void {
    for (const row of tabelas) {
      const key = this.normalizeTableKey(row.tabela ?? '');
      const table = this.findErdTableByKey(operationId, key);
      if (!table) continue;
      const hasInsert = (row.linhaInseridas ?? 0) > 0;
      const hasUpdate = (row.linhaAtualizadas ?? 0) > 0;
      let status: TableVisualStatus = 'idle';
      if (hasInsert && hasUpdate) status = 'syncing';
      else if (hasInsert) status = 'created';
      else if (hasUpdate) status = 'altered';
      this.erdTables.set(table.id, { ...table, status });
      if (table.columns.length) {
        const colStatus: ColumnVisualState[] = table.columns.map((c) => ({
          nome: c.nome,
          status: hasInsert ? 'insert' : hasUpdate ? 'update' : 'idle',
        }));
        this.erdTables.set(table.id, { ...this.erdTables.get(table.id)!, columns: colStatus });
      }
    }
    this.markSyncedTablesAfterVerify(operationId);
    this.rebuildGraph();
  }

  erdTablesForOperation(operationId: string): ErdTableNode[] {
    return [...this.erdTables.values()].filter((t) => t.operationId === operationId);
  }

  syncErdTableColumnVisuals(tableId: string): void {
    const table = this.erdTables.get(tableId);
    if (!table || !table.columns.length) return;

    if (table.status === 'done') {
      this.erdTables.set(tableId, {
        ...table,
        columns: table.columns.map((c) => ({ ...c, status: 'done' })),
      });
      this.rebuildGraph();
    }
  }

  private markSyncedTablesAfterVerify(operationId: string): void {
    for (const table of this.erdTablesForOperation(operationId)) {
      if (table.status !== 'idle') continue;
      const columns = table.columns.length
        ? table.columns.map((c) => ({ ...c, status: 'done' as const }))
        : table.columns;
      this.erdTables.set(table.id, { ...table, status: 'done', columns });
    }
  }

  applySyncResultVisuals(
    operationId: string,
    tabelas: TabelaAfetadaDTO[],
    errors?: string[]
  ): void {
    const errorTables = new Set(
      (errors ?? []).map((e) => e.toLowerCase())
    );
    for (const table of this.erdTablesForOperation(operationId)) {
      const key = this.normalizeTableKey(table.nome);
      const row = tabelas.find((t) => this.normalizeTableKey(t.tabela ?? '') === key);
      let status: TableVisualStatus = 'done';
      if (row?.erro || errorTables.size > 0) status = row?.erro ? 'error' : 'done';
      this.erdTables.set(table.id, { ...table, status });
    }
    this.rebuildGraph();
  }

  private erdEdgesForOperation(operationId: string): ErdEdge[] {
    return [...this.erdEdges.values()].filter((e) => e.operationId === operationId);
  }

  selectItem(kind: SyncDiagramKind, itemId: string, context: SyncDiagramContext): void {
    if (kind === 'bases') {
      this.selection.set({ base: itemId });
      this.spawnSchemas(itemId);
      this.persistSoon();
      return;
    }
    if (kind === 'schemas') {
      const base = context.base ?? this.selection().base;
      if (!base) return;
      this.selection.set({ base, esquema: itemId });
      this.spawnTables(base, itemId);
      this.persistSoon();
      return;
    }
    if (kind === 'tables') {
      const current = this.selection();
      const tabela = current.tabela === itemId ? undefined : itemId;
      this.selection.set({ base: current.base, esquema: current.esquema, tabela });
      this.rebuildGraph();
      this.persistSoon();
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
    this.persistSoon();
  }

  recolherNivel(): void {
    const sel = this.selection();
    if (sel.tabela) {
      this.selection.set({ base: sel.base, esquema: sel.esquema });
      this.rebuildGraph();
      this.persistSoon();
      return;
    }
    if (sel.esquema) {
      this.closeChildren('schemas');
      return;
    }
    if (sel.base) {
      this.closeChildren('bases');
    }
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

  private closeAllOperationDetails(exceptId?: string): void {
    this.operations.update((list) =>
      list.map((o) => ({
        ...o,
        detailOpen: exceptId ? o.id === exceptId : false,
      }))
    );
    if (!exceptId) {
      this.erdTables.clear();
      this.erdEdges.clear();
    } else {
      for (const [id, table] of this.erdTables.entries()) {
        if (table.operationId !== exceptId) this.erdTables.delete(id);
      }
      for (const [id, edge] of this.erdEdges.entries()) {
        if (edge.operationId !== exceptId) this.erdEdges.delete(id);
      }
    }
  }

  private clearErdForOperation(operationId: string): void {
    for (const [id, table] of this.erdTables.entries()) {
      if (table.operationId === operationId) this.erdTables.delete(id);
    }
    for (const [id, edge] of this.erdEdges.entries()) {
      if (edge.operationId === operationId) this.erdEdges.delete(id);
    }
    this.rebuildGraph();
  }

  private applyTableStatusMap(
    operationId: string,
    map: Map<string, TableVisualStatus>,
    syncedDefault = false
  ): void {
    for (const table of this.erdTablesForOperation(operationId)) {
      const key = this.normalizeTableKey(table.nome);
      const status = map.get(key) ?? (syncedDefault ? 'done' : table.status);
      this.erdTables.set(table.id, { ...table, status });
    }
  }

  private findErdTableByKey(operationId: string, key: string): ErdTableNode | undefined {
    return this.erdTablesForOperation(operationId).find(
      (t) => this.normalizeTableKey(t.nome) === key
    );
  }

  private normalizeTableKey(value: string): string {
    const v = value.trim().toLowerCase();
    if (v.includes('.')) return v.split('.').pop() ?? v;
    return v;
  }

  private operationNodeId(operationId: string): string {
    return `node-operation-${operationId}`;
  }

  private lastSelectorNodeId(): string {
    if (this.tablesNodeId) return this.tablesNodeId;
    if (this.schemasNodeId) return this.schemasNodeId;
    return this.basesNodeId;
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

  private applyStoredLayout(): void {
    const stored = this.persistence.load();
    if (!stored) return;

    this.syncMode.set(stored.syncMode ?? 'estrutura');
    this.selection.set({ ...stored.selection });

    for (const [nodeId, filter] of Object.entries(stored.filters ?? {})) {
      this.filters.set(nodeId, filter);
    }

    for (const [key, pos] of Object.entries(stored.positions ?? {})) {
      this.positions.set(key, { x: pos.x, y: pos.y });
    }
  }

  private restoreDrillDownFromSelection(): void {
    const sel = this.selection();
    if (!sel.base) {
      this.rebuildGraph();
      this.loadingInitial.set(false);
      return;
    }

    this.schemasNodeId = `node-schemas-${sel.base}`;
    this.ensurePosition(this.schemasNodeId, this.nextPosition(this.basesNodeId));

    if (this.schemaCache.has(sel.base)) {
      this.finishDrillDownRestore(sel);
      return;
    }

    this.loadingNodes.set(this.schemasNodeId, true);
    this.rebuildGraph();

    this.baseService.findAll(`sincronizacao/base/esquema/${sel.base}`).subscribe({
      next: (res) => {
        const items = (res as string[]).map((name) => ({ id: name, label: name }));
        this.schemaCache.set(sel.base!, items);
        this.loadingNodes.set(this.schemasNodeId!, false);
        this.finishDrillDownRestore(sel);
      },
      error: () => {
        this.schemaCache.set(sel.base!, []);
        this.loadingNodes.set(this.schemasNodeId!, false);
        this.finishDrillDownRestore(sel);
      },
    });
  }

  private finishDrillDownRestore(sel: SyncDiagramContext): void {
    if (!sel.base || !sel.esquema) {
      this.rebuildGraph();
      this.loadingInitial.set(false);
      return;
    }

    this.tablesNodeId = `node-tables-${sel.base}-${sel.esquema}`;
    this.ensurePosition(this.tablesNodeId, this.nextPosition(this.schemasNodeId!));
    const key = `${sel.base}|${sel.esquema}`;

    if (this.tableCache.has(key)) {
      this.rebuildGraph();
      this.loadingInitial.set(false);
      return;
    }

    this.loadingNodes.set(this.tablesNodeId, true);
    this.rebuildGraph();

    this.baseService
      .findAll(`sincronizacao/base/tabela/${sel.base}/${sel.esquema}`)
      .subscribe({
        next: (res) => {
          const items = (res as string[]).map((name) => ({ id: name, label: name }));
          this.tableCache.set(key, items);
          this.loadingNodes.set(this.tablesNodeId!, false);
          this.rebuildGraph();
          this.loadingInitial.set(false);
        },
        error: () => {
          this.tableCache.set(key, []);
          this.loadingNodes.set(this.tablesNodeId!, false);
          this.rebuildGraph();
          this.loadingInitial.set(false);
        },
      });
  }

  private erdStableKey(base: string, esquema: string, grafoNodeId: string): string {
    return `erd:${base}:${esquema}:${grafoNodeId}`;
  }

  private impactZoneNodeId(operationId: string): string {
    return `erd-zone-${operationId}`;
  }

  private isAffectedStatus(status: TableVisualStatus): boolean {
    return status !== 'idle' && status !== 'queued';
  }

  private computeImpactZone(
    op: SyncOperation,
    erdTables: ErdTableNode[],
    opPos: DiagramFlowPoint
  ): ErdImpactZone {
    const affected = erdTables.filter((t) => this.isAffectedStatus(t.status));
    const targetTables = affected.length ? affected : erdTables;
    const chips = this.buildImpactChips(op, erdTables);

    const boundsInputs = targetTables.map((table) => {
      const pos = this.getPosition(table.id, { x: opPos.x + ERD_ORIGIN_OFFSET_X, y: opPos.y });
      return {
        id: table.id,
        position: pos,
        width: this.layout.tableWidth,
        height: this.layout.estimateTableHeight(table),
      };
    });

    const bounds = this.layout.computeImpactBounds(boundsInputs);
    const esquema = op.context.esquema ?? 'schema';
    const title = `Alterações · ${esquema}`;

    if (!bounds) {
      return {
        id: this.impactZoneNodeId(op.id),
        operationId: op.id,
        x: opPos.x + ERD_ORIGIN_OFFSET_X - 48,
        y: opPos.y - 48,
        width: 320,
        height: 200,
        title,
        chips,
        tableIds: targetTables.map((t) => t.id),
      };
    }

    return {
      id: this.impactZoneNodeId(op.id),
      operationId: op.id,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      title,
      chips,
      tableIds: targetTables.map((t) => t.id),
    };
  }

  private buildImpactChips(op: SyncOperation, tables: ErdTableNode[]): ImpactCategoryChip[] {
    const counts: Record<ImpactChipKey, number> = {
      created: 0,
      altered: 0,
      linked: 0,
      syncing: 0,
      insert: 0,
      update: 0,
      error: 0,
    };

    if (op.mode === 'estrutura' && op.estruturaResponse?.categorias) {
      for (const cat of op.estruturaResponse.categorias) {
        const titulo = cat.titulo ?? '';
        const n = cat.items?.length ?? cat.total ?? 0;
        if (titulo.includes('Criação')) counts.created += n;
        else if (titulo.includes('Alterações')) counts.altered += n;
        else if (titulo.includes('Chaves')) counts.linked += n;
      }
    } else if (op.tabelasAfetadas?.length) {
      for (const row of op.tabelasAfetadas) {
        const ins = row.linhaInseridas ?? 0;
        const upd = row.linhaAtualizadas ?? 0;
        if (ins > 0) counts.insert++;
        if (upd > 0) counts.update++;
        if (row.erro) counts.error++;
      }
    }

    for (const table of tables) {
      switch (table.status) {
        case 'created':
          counts.created++;
          break;
        case 'altered':
          counts.altered++;
          break;
        case 'linked':
          counts.linked++;
          break;
        case 'syncing':
          counts.syncing++;
          break;
        case 'error':
          counts.error++;
          break;
        case 'running':
          counts.syncing++;
          break;
      }
    }

    const chips: ImpactCategoryChip[] = [];
    const push = (key: ImpactChipKey, label: string, count: number) => {
      if (count > 0) chips.push({ key, label, count });
    };

    push('created', 'Criação', counts.created);
    push('altered', 'Alterações', counts.altered);
    push('linked', 'FK', counts.linked);
    push('syncing', 'Em progresso', counts.syncing);
    push('insert', 'Inserções', counts.insert);
    push('update', 'Atualizações', counts.update);
    push('error', 'Erros', counts.error);

    return chips;
  }

  private persistSoon(): void {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }
    this.persistTimer = setTimeout(() => this.persistNow(), 250);
  }

  flushPersist(): void {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = undefined;
    }
    this.persistNow();
  }

  private persistNow(): void {
    this.persistence.save({
      version: 1,
      syncMode: this.syncMode(),
      selection: this.selection(),
      filters: Object.fromEntries(this.filters.entries()),
      positions: this.toPersistablePositions(),
    });
  }

  private toPersistablePositions(): Record<string, DiagramFlowPoint> {
    const out: Record<string, DiagramFlowPoint> = {};

    for (const [nodeId, pos] of this.positions.entries()) {
      if (nodeId.startsWith('node-operation-')) continue;

      if (nodeId.startsWith('erd:')) {
        out[nodeId] = { ...pos };
        continue;
      }

      if (nodeId.startsWith('erd-')) {
        const table = this.erdTables.get(nodeId);
        if (table) {
          const op = this.getOperation(table.operationId);
          if (op?.context.base && op?.context.esquema) {
            const grafoId = nodeId.replace(`erd-${table.operationId}-`, '');
            out[this.erdStableKey(op.context.base, op.context.esquema, grafoId)] = { ...pos };
          }
        }
        continue;
      }

      out[nodeId] = { ...pos };
    }

    return out;
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
    nodes.push(this.createSelectorNode(this.basesNodeId, basesMeta, DEFAULT_POSITIONS['node-bases']));

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
      nodes.push(
        this.createSelectorNode(
          this.schemasNodeId,
          schemasMeta,
          this.getPosition(this.schemasNodeId, this.nextPosition(this.basesNodeId))
        )
      );
      connections.push(
        this.createSelectorConnection(this.basesNodeId, this.schemasNodeId, !!sel.esquema)
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
      nodes.push(
        this.createSelectorNode(
          this.tablesNodeId,
          tablesMeta,
          this.getPosition(this.tablesNodeId, this.nextPosition(this.schemasNodeId!))
        )
      );
      connections.push(
        this.createSelectorConnection(this.schemasNodeId!, this.tablesNodeId, !!sel.tabela)
      );
    }

    const ops = this.operations();
    let lastLinkId = this.lastSelectorNodeId();
    for (const op of ops) {
      const opNodeId = this.operationNodeId(op.id);
      const fallback = this.nextPosition(lastLinkId);
      const opPos = this.getPosition(opNodeId, fallback);
      const connectors = this.connectorIds(opNodeId);
      nodes.push({
        id: opNodeId,
        type: 'operation',
        position: opPos,
        sourceConnectorId: connectors.source,
        targetConnectorId: connectors.target,
        operationMeta: op,
      });
      connections.push({
        id: `edge-op-link-${lastLinkId}-${opNodeId}`,
        sourceId: this.connectorIds(lastLinkId).source,
        targetId: connectors.target,
        active: true,
        kind: 'operation-link',
      });
      lastLinkId = opNodeId;

      if (op.detailOpen) {
        const erdTables = this.erdTablesForOperation(op.id);
        const zone = this.computeImpactZone(op, erdTables, opPos);
        const hasAffected = zone.chips.length > 0;

        if (zone.width > 0 && zone.height > 0) {
          const zoneConnectors = this.connectorIds(zone.id);
          nodes.push({
            id: zone.id,
            type: 'erd-zone',
            position: { x: zone.x, y: zone.y },
            sourceConnectorId: zoneConnectors.source,
            targetConnectorId: zoneConnectors.target,
            erdZoneMeta: zone,
          });
        }

        for (const erd of erdTables) {
          const erdConnectors = this.connectorIds(erd.id);
          const erdPos = this.getPosition(erd.id, { x: opPos.x + ERD_ORIGIN_OFFSET_X, y: opPos.y });
          const erdMeta: ErdTableNode = { ...erd };
          nodes.push({
            id: erd.id,
            type: 'erd-table',
            position: erdPos,
            sourceConnectorId: erdConnectors.source,
            targetConnectorId: erdConnectors.target,
            erdMeta,
          });
        }
        for (const edge of this.erdEdgesForOperation(op.id)) {
          connections.push({
            id: edge.id,
            sourceId: `${edge.sourceId}::out`,
            targetId: `${edge.targetId}::in`,
            active: edge.status === 'active' || edge.status === 'done',
            kind: 'erd-fk',
          });
        }
      }
    }

    this.flowNodes.set(nodes);
    this.flowConnections.set(connections);
  }

  private createSelectorNode(
    id: string,
    meta: SyncDiagramNodeData,
    defaultPosition: DiagramFlowPoint
  ): DiagramFlowNode {
    const connectors = this.connectorIds(id);
    return {
      id,
      type: 'selector',
      position: this.getPosition(id, defaultPosition),
      sourceConnectorId: connectors.source,
      targetConnectorId: connectors.target,
      selectorMeta: meta,
    };
  }

  private createSelectorConnection(
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
      kind: 'selector',
    };
  }
}
