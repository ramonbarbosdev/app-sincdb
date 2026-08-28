import { Injectable, inject, signal } from '@angular/core';
import { EstruturaResponse } from '../../../components/estrutura-preview/estrutura-preview';
import { BaseService } from '../../../services/base.service';
import {
  ColumnVisualState,
  DiagramFlowConnection,
  DiagramFlowConnectionLabel,
  DiagramFlowNode,
  DiagramFlowPoint,
  ErdEdge,
  ErdImpactZone,
  ErdTableNode,
  ImpactCategoryChip,
  ImpactChipKey,
  SyncDiagramBreadcrumbItem,
  SyncDiagramContext,
  SyncDiagramItem,
  SyncDiagramKind,
  SyncDiagramMode,
  SyncDiagramNodeData,
  SyncDiagramTreeLayout,
  OperationActionKind,
  OperationPhase,
  operationScopeKey,
  OperationLogEntry,
  schemaScopeKey,
  contextHasTableScope,
  formatOperationScopeSubtitle,
  SyncOperation,
  TableVisualStatus,
  TabelaAfetadaDTO,
} from '../models/sync-diagram.model';
import { SyncDiagramLayoutPersistenceService } from './sync-diagram-layout-persistence.service';
import { SyncDiagramLayoutService } from './sync-diagram-layout.service';

const DEFAULT_POSITIONS: Record<string, DiagramFlowPoint> = {
  'node-bases': { x: 80, y: 100 },
};

const OPERATION_HORIZONTAL_GAP = 90;
const OPERATION_CARD_WIDTH = 260;
const OPERATION_CARD_HEIGHT = 160;
const TREE_LEVEL_GAP = 72;
const TREE_SIBLING_GAP = 40;
const SELECTOR_LIST_WIDTH = 260;
const SCHEMA_BOX_WIDTH = 220;
const TABLES_CARD_WIDTH = 280;
const SELECTOR_LIST_HEIGHT = 360;
const TABLES_CARD_HEIGHT = 360;
const SCHEMA_BOX_HEIGHT = 140;
const NODE_COLLISION_PADDING = 32;
const ERD_ORIGIN_OFFSET_X = 360;
const FLOW_CARD_CENTER_Y = 120;
const GRAPH_REBUILD_DELAY_MS = 120;
const CONNECTION_LABELS_DELAY_MS = 50;

@Injectable()
export class SyncDiagramStateService {
  private baseService = inject(BaseService);
  private layout = inject(SyncDiagramLayoutService);
  private persistence = inject(SyncDiagramLayoutPersistenceService);

  readonly syncMode = signal<SyncDiagramMode>('estrutura');
  readonly flowNodes = signal<DiagramFlowNode[]>([]);
  readonly flowConnections = signal<DiagramFlowConnection[]>([]);
  readonly flowConnectionLabels = signal<DiagramFlowConnectionLabel[]>([]);
  readonly loadingInitial = signal(true);
  readonly selection = signal<SyncDiagramContext>({});
  readonly treeLayout = signal<SyncDiagramTreeLayout>('vertical');
  readonly operations = signal<SyncOperation[]>([]);
  /** Incrementado ao aplicar filtro — atualiza listas sem recriar nós do fluxo. */
  readonly filterRevision = signal(0);

  private bases: SyncDiagramItem[] = [];
  private schemaCache = new Map<string, SyncDiagramItem[]>();
  private tableCache = new Map<string, SyncDiagramItem[]>();

  private nodeMeta = new Map<string, SyncDiagramNodeData>();
  private filters = new Map<string, string>();
  private loadingNodes = new Map<string, boolean>();
  private positions = new Map<string, DiagramFlowPoint>();
  private readonly manualNodePositions = new Set<string>();

  private basesNodeId = 'node-bases';
  private readonly openSchemaListBases = new Set<string>();
  private readonly openSchemaBoxes = new Set<string>();
  private readonly openTablesKeys = new Set<string>();

  private erdTables = new Map<string, ErdTableNode>();
  private erdEdges = new Map<string, ErdEdge>();
  private activeOperationId?: string;
  private persistTimer?: ReturnType<typeof setTimeout>;
  private graphRebuildTimer?: ReturnType<typeof setTimeout>;
  private connectionLabelsTimer?: ReturnType<typeof setTimeout>;
  private readonly erdDataVersion = signal(0);

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

  setTreeLayout(mode: SyncDiagramTreeLayout): void {
    if (this.treeLayout() === mode) return;
    this.treeLayout.set(mode);
    this.layoutTreeBranches();
    this.rebuildGraph();
    this.persistSoon();
  }

  setFilter(nodeId: string, value: string): void {
    this.filters.set(nodeId, value);
    const meta = this.nodeMeta.get(nodeId);
    if (meta) {
      this.nodeMeta.set(nodeId, { ...meta, filter: value });
    }
    this.filterRevision.update((n) => n + 1);
    this.persistSoon();
  }

  updateNodePosition(nodeId: string, position: DiagramFlowPoint): void {
    const point = { x: position.x, y: position.y };
    this.positions.set(nodeId, point);

    if (nodeId.startsWith('node-') || nodeId.startsWith('erd-')) {
      this.manualNodePositions.add(nodeId);
    }

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
        this.flowNodes.update((nodes) =>
          nodes.map((n) => (n.id === nodeId ? { ...n, position: point } : n))
        );
        this.scheduleConnectionLabelsRefresh();
      }
    }

    if (nodeId.startsWith('node-')) {
      this.scheduleConnectionLabelsRefresh();
    }

    this.persistSoon();
  }

  findOperationByScope(context: SyncDiagramContext, mode: SyncDiagramMode): SyncOperation | undefined {
    const key = operationScopeKey(context, mode);
    return this.operations().find(
      (op) => operationScopeKey(op.context, op.mode) === key
    );
  }

  isOperationRunning(op: SyncOperation): boolean {
    return (
      op.phase === 'verificando' ||
      op.phase === 'sincronizando' ||
      op.phase === 'verificado'
    );
  }

  isTerminalOperationPhase(phase: OperationPhase): boolean {
    return phase === 'cancelado' || phase === 'erro' || phase === 'concluido';
  }

  schemasListNodeId(base: string): string {
    return `node-schemas-${base}`;
  }

  schemaBoxNodeId(base: string, esquema: string): string {
    return `node-schema-${base}-${esquema}`;
  }

  tablesNodeIdFor(base: string, esquema: string): string {
    return `node-tables-${base}-${esquema}`;
  }

  parseScopeKey(key: string): { base: string; esquema: string } | undefined {
    const idx = key.indexOf('|');
    if (idx < 0) return undefined;
    return { base: key.slice(0, idx), esquema: key.slice(idx + 1) };
  }

  resolveOperationAnchorNodeId(context: SyncDiagramContext): string {
    const base = context.base;
    const esquema = context.esquema;
    if (!base) return this.basesNodeId;

    if (esquema) {
      const scopeKey = schemaScopeKey(base, esquema);
      if (contextHasTableScope(context) && this.openTablesKeys.has(scopeKey)) {
        return this.tablesNodeIdFor(base, esquema);
      }
      if (this.openSchemaBoxes.has(scopeKey)) {
        return this.schemaBoxNodeId(base, esquema);
      }
    }

    if (this.openSchemaListBases.has(base)) {
      return this.schemasListNodeId(base);
    }

    return this.basesNodeId;
  }

  ensureNodesForContext(context: SyncDiagramContext): void {
    const base = context.base;
    const esquema = context.esquema;
    if (!base) return;

    if (!this.openSchemaListBases.has(base)) {
      this.spawnSchemaList(base, { silent: true });
    }

    if (esquema) {
      const scopeKey = schemaScopeKey(base, esquema);
      if (contextHasTableScope(context) && !this.openTablesKeys.has(scopeKey)) {
        this.spawnTables(base, esquema, { silent: true, fromSchemaList: true });
      }
    }
  }

  findOperationByQueueItemId(queueItemId: string): SyncOperation | undefined {
    return this.operations().find((o) => o.queueItemId === queueItemId);
  }

  spawnQueuedOperation(
    queueItemId: string,
    mode: SyncDiagramMode,
    context: SyncDiagramContext
  ): string {
    this.ensureNodesForContext(context);
    const anchorNodeId = this.resolveOperationAnchorNodeId(context);
    const existing = this.findOperationByScope(context, mode);
    if (existing?.phase === 'aguardando') {
      this.patchOperation(existing.id, { queueItemId, anchorNodeId });
      return existing.id;
    }
    if (existing && !this.isOperationRunning(existing)) {
      this.reuseOperation(existing.id, {
        mode,
        action: 'verificar-sync',
        context: { ...context },
        anchorNodeId,
        queueItemId,
        phase: 'aguardando',
        progress: 0,
        label: formatOperationScopeSubtitle(context),
        detailOpen: false,
        errorsExpanded: false,
        terminalLogs: [],
        estruturaResponse: undefined,
        tabelasAfetadas: undefined,
        errors: undefined,
        tabelaAtual: undefined,
      });
      return existing.id;
    }

    const id = `op-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const operation: SyncOperation = {
      id,
      mode,
      action: 'verificar-sync',
      context: { ...context },
      anchorNodeId,
      queueItemId,
      phase: 'aguardando',
      progress: 0,
      label: formatOperationScopeSubtitle(context),
      detailOpen: false,
      errorsExpanded: false,
      terminalLogs: [],
    };
    this.spawnOperation(operation);
    return id;
  }

  removeOperationByQueueItemId(queueItemId: string): void {
    const op = this.findOperationByQueueItemId(queueItemId);
    if (op?.phase === 'aguardando') {
      this.removeOperation(op.id);
    }
  }

  promoteQueuedOperation(operationId: string, action: OperationActionKind): void {
    const op = this.getOperation(operationId);
    if (!op || op.phase !== 'aguardando') return;
    this.clearErdForOperation(operationId);
    this.patchOperation(operationId, {
      phase: action === 'sincronizar' ? 'sincronizando' : 'verificando',
      action,
      progress: 0,
      queueItemId: undefined,
      terminalLogs: [],
      detailOpen: false,
      errorsExpanded: false,
      estruturaResponse: undefined,
      tabelasAfetadas: undefined,
      errors: undefined,
      tabelaAtual: undefined,
    });
    this.activeOperationId = operationId;
  }

  reuseOperation(operationId: string, operation: Omit<SyncOperation, 'id'>): void {
    this.clearErdForOperation(operationId);
    this.closeAllOperationDetails();
    const fresh: SyncOperation = {
      id: operationId,
      ...operation,
      detailOpen: false,
      errorsExpanded: false,
      terminalLogs: operation.terminalLogs ?? [],
    };
    this.operations.update((list) =>
      list.map((o) => (o.id === operationId ? fresh : o))
    );
    this.rebuildGraph();
  }

  spawnOperation(operation: SyncOperation): void {
    this.operations.update((list) => {
      const without = list.filter((o) => o.id !== operation.id);
      return [...without, operation];
    });
    if (this.isOperationRunning(operation)) {
      this.activeOperationId = operation.id;
    }
    this.closeAllOperationDetails();

    const opNodeId = this.operationNodeId(operation.id);
    if (!this.manualNodePositions.has(opNodeId) && !this.positions.has(opNodeId)) {
      this.positions.set(
        opNodeId,
        this.computeOperationPosition(operation.anchorNodeId, operation.id)
      );
    }
    this.syncOperationAnchors();
    this.rebuildGraph();
  }

  private computeOperationPosition(anchorNodeId: string, operationId: string): DiagramFlowPoint {
    const stored = this.positions.get(this.operationNodeId(operationId));
    if (stored) return { ...stored };

    const anchorPos =
      this.positions.get(anchorNodeId) ?? DEFAULT_POSITIONS[anchorNodeId] ?? { x: 80, y: 100 };
    const anchorWidth = this.nodeSizeFor(anchorNodeId).width;
    const atAnchor = this.operations()
      .filter((o) => o.anchorNodeId === anchorNodeId)
      .sort((a, b) => a.id.localeCompare(b.id));
    const index = atAnchor.findIndex((o) => o.id === operationId);
    const safeIndex = index >= 0 ? index : atAnchor.length;
    const originX = anchorPos.x + anchorWidth + TREE_LEVEL_GAP;
    if (this.treeLayout() === 'vertical') {
      return {
        x: originX,
        y: anchorPos.y + safeIndex * (OPERATION_CARD_HEIGHT + TREE_SIBLING_GAP),
      };
    }
    return {
      x: originX + safeIndex * (OPERATION_CARD_WIDTH + OPERATION_HORIZONTAL_GAP),
      y: anchorPos.y,
    };
  }

  autoLayoutCanvas(): void {
    this.manualNodePositions.clear();
    const basesPos = { x: 80, y: 100 };
    this.positions.set(this.basesNodeId, { ...basesPos });
    this.layoutTreeBranches();

    const anchorGroups = new Map<string, SyncOperation[]>();
    for (const op of this.operations()) {
      const list = anchorGroups.get(op.anchorNodeId) ?? [];
      list.push(op);
      anchorGroups.set(op.anchorNodeId, list);
    }

    for (const [anchorNodeId, ops] of anchorGroups) {
      const anchorPos = this.positions.get(anchorNodeId) ?? basesPos;
      ops.forEach((op) => {
        const opNodeId = this.operationNodeId(op.id);
        const opPos = this.positions.get(opNodeId) ?? this.computeOperationPosition(anchorNodeId, op.id);

        if (op.detailOpen) {
          const erdTables = this.erdTablesForOperation(op.id);
          if (erdTables.length > 0) {
            const erdOrigin = { x: opPos.x + ERD_ORIGIN_OFFSET_X, y: opPos.y };
            const layoutPositions = this.layout.layoutErd(
              erdTables.map((t) => ({ id: t.id })),
              erdOrigin
            );
            for (const [erdId, pos] of layoutPositions) {
              this.positions.set(erdId, pos);
              const table = this.erdTables.get(erdId);
              if (table && op.context.base && op.context.esquema) {
                const grafoId = erdId.replace(`erd-${table.operationId}-`, '');
                this.positions.set(
                  this.erdStableKey(op.context.base, op.context.esquema, grafoId),
                  pos
                );
              }
            }
          }
        }
      });
    }

    this.rebuildGraph();
    this.persistNow();
  }

  selectedTabelas(sel?: SyncDiagramContext): string[] {
    const context = sel ?? this.selection();
    if (context.tabelas?.length) return [...context.tabelas];
    if (context.tabela) return [context.tabela];
    return [];
  }

  breadcrumbTrail(): SyncDiagramBreadcrumbItem[] {
    const sel = this.selection();
    const trail: SyncDiagramBreadcrumbItem[] = [];
    if (!sel.base) return trail;

    trail.push({ label: sel.base, context: { base: sel.base } });

    if (sel.esquema) {
      trail.push({
        label: sel.esquema,
        context: { base: sel.base, esquema: sel.esquema },
      });
    }

    const tabelas = this.selectedTabelas(sel);
    if (tabelas.length === 1) {
      trail.push({
        label: tabelas[0],
        context: { base: sel.base, esquema: sel.esquema!, tabelas: [tabelas[0]] },
      });
    } else if (tabelas.length > 1) {
      trail.push({
        label: `${tabelas.length} tabelas`,
        context: { base: sel.base, esquema: sel.esquema!, tabelas: [...tabelas] },
      });
    }

    return trail;
  }

  navigateToBreadcrumb(target: SyncDiagramContext): void {
    const base = target.base;
    if (!base) {
      this.openSchemaListBases.clear();
      this.openSchemaBoxes.clear();
      this.openTablesKeys.clear();
      this.selection.set({});
      this.rebuildGraph();
      this.persistSoon();
      return;
    }

    this.spawnSchemaList(base, { silent: true });

    if (!target.esquema) {
      this.selection.set({ base });
      this.ensureSchemasLoaded(base);
      return;
    }

    if (this.selectedTabelas(target).length > 0) {
      this.spawnTables(base, target.esquema, { silent: true, fromSchemaList: true });
    } else {
      this.spawnSchemaBox(base, target.esquema, { silent: true });
    }

    const nextSelection: SyncDiagramContext = { base, esquema: target.esquema };
    const tabelas = target.tabelas?.length ? [...target.tabelas] : [];
    if (tabelas.length) {
      nextSelection.tabelas = tabelas;
    }
    this.selection.set(nextSelection);
    this.ensureSchemasAndTablesLoaded(base, target.esquema);
  }

  patchOperation(operationId: string, patch: Partial<SyncOperation>): void {
    const current = this.getOperation(operationId);
    if (!current) return;

    const changedPatch = Object.fromEntries(
      Object.entries(patch).filter(
        ([key, value]) =>
          current[key as keyof SyncOperation] !== value
      )
    ) as Partial<SyncOperation>;

    if (!Object.keys(changedPatch).length) return;

    this.operations.update((list) =>
      list.map((o) => (o.id === operationId ? { ...o, ...changedPatch } : o))
    );
    if (this.operationPatchRequiresGraphRebuild(changedPatch)) {
      if (changedPatch.phase === 'cancelado') {
        this.rebuildGraph();
      } else {
        this.scheduleGraphRebuild();
      }
    }
  }

  resetOperationVisualsOnCancel(operationId: string): void {
    for (const table of this.erdTablesForOperation(operationId)) {
      const columns = table.columns.map((c) => ({ ...c, status: 'idle' as const }));
      this.erdTables.set(table.id, { ...table, status: 'idle', columns });
    }
    for (const edge of this.erdEdgesForOperation(operationId)) {
      this.erdEdges.set(edge.id, { ...edge, status: 'idle' });
    }
    this.bumpErdData();
  }

  appendOperationLog(operationId: string, entry: OperationLogEntry): void {
    this.operations.update((list) =>
      list.map((o) =>
        o.id === operationId
          ? { ...o, terminalLogs: [...(o.terminalLogs ?? []), entry] }
          : o
      )
    );
  }

  getErdTable(tableId: string): ErdTableNode | undefined {
    this.erdDataVersion();
    return this.erdTables.get(tableId);
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

  toggleOperationErrorsExpanded(operationId: string): void {
    const op = this.getOperation(operationId);
    if (!op) return;
    this.operations.update((list) =>
      list.map((o) =>
        o.id === operationId ? { ...o, errorsExpanded: !op.errorsExpanded } : o
      )
    );
  }

  removeOperation(operationId: string): void {
    this.operations.update((list) => list.filter((o) => o.id !== operationId));
    this.clearErdForOperation(operationId);
    const opNodeId = this.operationNodeId(operationId);
    this.positions.delete(opNodeId);
    if (this.activeOperationId === operationId) {
      this.activeOperationId = undefined;
    }
    this.rebuildGraph();
    this.persistSoon();
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
    this.bumpErdData();
    if (this.erdPatchRequiresGraphRebuild(patch)) {
      this.scheduleGraphRebuild();
    }
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
      this.bumpErdData();
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
      this.spawnSchemaList(itemId);
      this.persistSoon();
      return;
    }
    if (kind === 'schemas') {
      const base = context.base;
      if (!base) return;
      this.selection.set({ base, esquema: itemId });
      this.rebuildGraph();
      this.persistSoon();
      return;
    }
    if (kind === 'tables') {
      const base = context.base;
      const esquema = context.esquema;
      if (!base || !esquema) return;

      const sel = this.selection();
      const sameScope = sel.base === base && sel.esquema === esquema;
      const tabelas = new Set(sameScope ? this.selectedTabelas(sel) : []);
      if (tabelas.has(itemId)) {
        tabelas.delete(itemId);
      } else {
        tabelas.add(itemId);
      }
      this.selection.set({
        base,
        esquema,
        tabelas: [...tabelas],
      });
      this.rebuildGraph();
      this.persistSoon();
    }
  }

  drillToItem(kind: SyncDiagramKind, itemId: string, context: SyncDiagramContext): void {
    if (kind === 'schemas') {
      const base = context.base;
      if (!base) return;
      this.selection.set({ base, esquema: itemId });
      this.spawnTables(base, itemId, { fromSchemaList: true });
      this.persistSoon();
      return;
    }
    if (kind === 'schema') {
      const base = context.base ?? this.selection().base;
      const esquema = context.esquema ?? itemId;
      if (!base || !esquema) return;
      this.selection.set({ base, esquema });
      this.spawnTables(base, esquema);
      this.persistSoon();
      return;
    }
    if (kind === 'bases') {
      this.selection.set({ base: itemId });
      this.spawnSchemaList(itemId);
      this.persistSoon();
    }
  }

  closeNodeForCard(node: SyncDiagramNodeData): void {
    if (node.kind === 'bases' && node.selectedItemId) {
      this.closeSchemaListForBase(node.selectedItemId);
      return;
    }
    if (node.kind === 'schemas') {
      const base = node.context.base;
      if (!base) return;
      const opened = node.openedItemIds ?? [];
      if (opened.length === 1) {
        this.closeTablesForSchema(base, opened[0]);
      } else if (opened.length > 1) {
        for (const esquema of opened) {
          this.openTablesKeys.delete(schemaScopeKey(base, esquema));
          this.positions.delete(this.tablesNodeIdFor(base, esquema));
        }
        this.layoutTreeBranches();
        this.rebuildGraph();
        this.persistSoon();
      } else if (node.openedItemId) {
        this.closeTablesForSchema(base, node.openedItemId);
      } else {
        this.closeSchemaListForBase(base);
      }
      return;
    }
    if (node.kind === 'tables') {
      const base = node.context.base;
      const esquema = node.context.esquema;
      if (base && esquema) {
        this.closeTablesForSchema(base, esquema);
      }
      return;
    }
    if (node.kind === 'schema') {
      const base = node.context.base;
      const esquema = node.context.esquema;
      if (!base || !esquema) return;
      if (node.openedItemId) {
        this.closeTablesForSchema(base, esquema);
      } else {
        this.closeSchemaBox(base, esquema);
      }
    }
  }

  private closeSchemaListForBase(base: string): void {
    this.openSchemaListBases.delete(base);
    for (const key of [...this.openSchemaBoxes]) {
      const parsed = this.parseScopeKey(key);
      if (parsed?.base === base) {
        this.openSchemaBoxes.delete(key);
        this.openTablesKeys.delete(key);
        this.positions.delete(this.schemaBoxNodeId(parsed.base, parsed.esquema));
        this.positions.delete(this.tablesNodeIdFor(parsed.base, parsed.esquema));
      }
    }
    this.positions.delete(this.schemasListNodeId(base));
    const sel = this.selection();
    if (sel.base === base && !sel.esquema) {
      this.selection.set({});
    }
    this.layoutTreeBranches();
    this.rebuildGraph();
    this.persistSoon();
  }

  private closeTablesForSchema(base: string, esquema: string): void {
    const key = schemaScopeKey(base, esquema);
    this.openTablesKeys.delete(key);
    this.positions.delete(this.tablesNodeIdFor(base, esquema));
    const sel = this.selection();
    if (sel.base === base && sel.esquema === esquema) {
      this.selection.set({ base, esquema });
    }
    this.layoutTreeBranches();
    this.rebuildGraph();
    this.persistSoon();
  }

  closeSchemaBox(base: string, esquema: string): void {
    const key = schemaScopeKey(base, esquema);
    this.openSchemaBoxes.delete(key);
    this.openTablesKeys.delete(key);
    this.positions.delete(this.schemaBoxNodeId(base, esquema));
    this.positions.delete(this.tablesNodeIdFor(base, esquema));
    this.layoutTreeBranches();
    this.rebuildGraph();
    this.persistSoon();
  }

  recolherNivel(): void {
    const sel = this.selection();
    if (this.selectedTabelas(sel).length > 0) {
      this.selection.set({ base: sel.base, esquema: sel.esquema });
      this.rebuildGraph();
      this.persistSoon();
      return;
    }
    if (sel.esquema) {
      this.closeTablesForSchema(sel.base!, sel.esquema);
      return;
    }
    if (sel.base) {
      this.closeSchemaListForBase(sel.base);
    }
  }

  filteredItems(nodeId: string): SyncDiagramItem[] {
    const meta = this.nodeMeta.get(nodeId);
    if (!meta) return [];
    const q = (this.filters.get(nodeId) ?? '').trim().toLowerCase();
    if (!q) return meta.items;
    return meta.items.filter((i) => i.label.toLowerCase().includes(q));
  }

  private spawnSchemaList(base: string, options?: { silent?: boolean }): void {
    const alreadyOpen = this.openSchemaListBases.has(base);
    this.openSchemaListBases.add(base);
    const listId = this.schemasListNodeId(base);
    if (!options?.silent) {
      this.selection.set({ base });
    }
    if (!alreadyOpen) {
      this.layoutTreeBranches();
    }

    const cached = this.schemaCache.get(base);
    if (cached) {
      this.rebuildGraph();
      if (!options?.silent) this.persistSoon();
      return;
    }

    this.loadingNodes.set(listId, true);
    this.rebuildGraph();

    this.baseService.findAll(`sincronizacao/base/esquema/${base}`).subscribe({
      next: (res) => {
        const items = (res as string[]).map((name) => ({ id: name, label: name }));
        this.schemaCache.set(base, items);
        this.loadingNodes.set(listId, false);
        this.rebuildGraph();
        if (!options?.silent) this.persistSoon();
      },
      error: () => {
        this.schemaCache.set(base, []);
        this.loadingNodes.set(listId, false);
        this.rebuildGraph();
        if (!options?.silent) this.persistSoon();
      },
    });
  }

  private spawnSchemaBox(
    base: string,
    esquema: string,
    options?: { silent?: boolean }
  ): void {
    const key = schemaScopeKey(base, esquema);
    const alreadyOpen = this.openSchemaBoxes.has(key);
    this.openSchemaBoxes.add(key);
    if (!this.openSchemaListBases.has(base)) {
      this.spawnSchemaList(base, { silent: true });
    }
    if (!options?.silent) {
      this.selection.set({ base, esquema });
    }
    if (!alreadyOpen) {
      this.layoutTreeBranches();
    }
    this.rebuildGraph();
    if (!options?.silent) this.persistSoon();
  }

  private tablesLinkFromId(base: string, esquema: string): string {
    const key = schemaScopeKey(base, esquema);
    if (this.openSchemaBoxes.has(key)) {
      return this.schemaBoxNodeId(base, esquema);
    }
    return this.schemasListNodeId(base);
  }

  private spawnTables(
    base: string,
    esquema: string,
    options?: { silent?: boolean; fromSchemaList?: boolean }
  ): void {
    const key = schemaScopeKey(base, esquema);
    const wasOpen = this.openTablesKeys.has(key);
    this.openTablesKeys.add(key);
    if (this.openSchemaBoxes.has(key)) {
      this.openSchemaBoxes.delete(key);
      this.positions.delete(this.schemaBoxNodeId(base, esquema));
    }
    if (!this.openSchemaListBases.has(base)) {
      this.spawnSchemaList(base, { silent: true });
    }
    if (!wasOpen) {
      this.layoutTreeBranches();
      this.syncOperationAnchors();
    }
    const nodeId = this.tablesNodeIdFor(base, esquema);
    const cacheKey = key;
    const cached = this.tableCache.get(cacheKey);

    if (cached) {
      this.rebuildGraph();
      if (!options?.silent) this.persistSoon();
      return;
    }

    this.loadingNodes.set(nodeId, true);
    this.rebuildGraph();

    this.baseService.findAll(`sincronizacao/base/tabela/${base}/${esquema}`).subscribe({
      next: (res) => {
        const items = (res as string[]).map((name) => ({ id: name, label: name }));
        this.tableCache.set(cacheKey, items);
        this.loadingNodes.set(nodeId, false);
        this.rebuildGraph();
        if (!options?.silent) this.persistSoon();
      },
      error: () => {
        this.tableCache.set(cacheKey, []);
        this.loadingNodes.set(nodeId, false);
        this.rebuildGraph();
        if (!options?.silent) this.persistSoon();
      },
    });
  }

  private sortedOpenBases(): string[] {
    return [...this.openSchemaListBases].sort();
  }

  private schemaChildrenKeys(base: string): string[] {
    return [...new Set([...this.openSchemaBoxes, ...this.openTablesKeys])]
      .filter((k) => this.parseScopeKey(k)?.base === base)
      .sort();
  }

  private operationsForAnchor(anchorNodeId: string): SyncOperation[] {
    return this.operations()
      .filter((o) => o.anchorNodeId === anchorNodeId)
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  private layoutOperationChildren(
    anchorNodeId: string,
    originX: number,
    originY: number
  ): { width: number; height: number } {
    const ops = this.operationsForAnchor(anchorNodeId);
    if (!ops.length) return { width: 0, height: 0 };

    const direction = this.treeLayout();
    let cursorX = originX;
    let cursorY = originY;
    let width = 0;
    let height = 0;

    for (const op of ops) {
      this.setLayoutPosition(this.operationNodeId(op.id), { x: cursorX, y: cursorY });
      if (direction === 'vertical') {
        cursorY += OPERATION_CARD_HEIGHT + TREE_SIBLING_GAP;
        width = Math.max(width, OPERATION_CARD_WIDTH);
        height = cursorY - originY - TREE_SIBLING_GAP;
      } else {
        cursorX += OPERATION_CARD_WIDTH + OPERATION_HORIZONTAL_GAP;
        width = cursorX - originX - OPERATION_HORIZONTAL_GAP;
        height = Math.max(height, OPERATION_CARD_HEIGHT);
      }
    }

    return { width, height };
  }

  private layoutNodeWithOperations(
    nodeId: string,
    x: number,
    y: number,
    nodeWidth: number,
    nodeHeight: number
  ): { width: number; height: number } {
    this.setLayoutPosition(nodeId, { x, y });
    const opsExt = this.layoutOperationChildren(
      nodeId,
      x + nodeWidth + TREE_LEVEL_GAP,
      y
    );
    return {
      width: nodeWidth + (opsExt.width ? TREE_LEVEL_GAP + opsExt.width : 0),
      height: Math.max(nodeHeight, opsExt.height || 0),
    };
  }

  private layoutSchemaChild(
    base: string,
    esquema: string,
    x: number,
    y: number
  ): { width: number; height: number } {
    const key = schemaScopeKey(base, esquema);
    if (this.openTablesKeys.has(key)) {
      return this.layoutNodeWithOperations(
        this.tablesNodeIdFor(base, esquema),
        x,
        y,
        TABLES_CARD_WIDTH,
        TABLES_CARD_HEIGHT
      );
    }
    return this.layoutNodeWithOperations(
      this.schemaBoxNodeId(base, esquema),
      x,
      y,
      SCHEMA_BOX_WIDTH,
      SCHEMA_BOX_HEIGHT
    );
  }

  private layoutBaseBranch(base: string, x: number, y: number): { width: number; height: number } {
    const listId = this.schemasListNodeId(base);
    this.setLayoutPosition(listId, { x, y });

    const keys = this.schemaChildrenKeys(base);
    if (!keys.length) {
      return { width: SELECTOR_LIST_WIDTH, height: SELECTOR_LIST_HEIGHT };
    }

    const direction = this.treeLayout();
    const childOriginX = x + SELECTOR_LIST_WIDTH + TREE_LEVEL_GAP;
    let cursorX = childOriginX;
    let cursorY = y;
    let childrenWidth = 0;
    let childrenHeight = 0;

    for (const key of keys) {
      const parsed = this.parseScopeKey(key)!;
      const ext = this.layoutSchemaChild(parsed.base, parsed.esquema, cursorX, cursorY);
      if (direction === 'vertical') {
        cursorY += ext.height + TREE_SIBLING_GAP;
        childrenWidth = Math.max(childrenWidth, ext.width);
        childrenHeight = cursorY - y - TREE_SIBLING_GAP;
      } else {
        cursorX += ext.width + TREE_SIBLING_GAP;
        childrenWidth = cursorX - childOriginX - TREE_SIBLING_GAP;
        childrenHeight = Math.max(childrenHeight, ext.height);
      }
    }

    return {
      width: SELECTOR_LIST_WIDTH + TREE_LEVEL_GAP + childrenWidth,
      height: Math.max(SELECTOR_LIST_HEIGHT, childrenHeight),
    };
  }

  /** Árvore: Bases → Schemas → Tabelas → operação. */
  layoutTreeBranches(): void {
    const basesPos = { ...(this.positions.get(this.basesNodeId) ?? DEFAULT_POSITIONS['node-bases']) };
    this.setLayoutPosition(this.basesNodeId, basesPos);

    const bases = this.sortedOpenBases();
    if (!bases.length) return;

    const direction = this.treeLayout();
    const basesWidth = this.nodeSizeFor(this.basesNodeId).width;
    const childOriginX = basesPos.x + basesWidth + TREE_LEVEL_GAP;
    let cursorX = childOriginX;
    let cursorY = basesPos.y;

    for (const base of bases) {
      const ext = this.layoutBaseBranch(base, cursorX, cursorY);
      if (direction === 'vertical') {
        cursorY += ext.height + TREE_SIBLING_GAP;
      } else {
        cursorX += ext.width + TREE_SIBLING_GAP;
      }
    }
  }

  private computeSchemaListPosition(base: string): DiagramFlowPoint {
    const listId = this.schemasListNodeId(base);
    const stored = this.positions.get(listId);
    if (stored) return { ...stored };
    const basesPos = this.positions.get(this.basesNodeId) ?? DEFAULT_POSITIONS['node-bases'];
    const basesWidth = this.nodeSizeFor(this.basesNodeId).width;
    return { x: basesPos.x + basesWidth + TREE_LEVEL_GAP, y: basesPos.y };
  }

  private computeSchemaBoxPosition(base: string, esquema: string): DiagramFlowPoint {
    const schemaNodeId = this.schemaBoxNodeId(base, esquema);
    const stored = this.positions.get(schemaNodeId);
    if (stored) return { ...stored };
    const listPos = this.computeSchemaListPosition(base);
    return { x: listPos.x + SELECTOR_LIST_WIDTH + TREE_LEVEL_GAP, y: listPos.y };
  }

  private computeTablesPosition(base: string, esquema: string): DiagramFlowPoint {
    const tablesNodeId = this.tablesNodeIdFor(base, esquema);
    const stored = this.positions.get(tablesNodeId);
    if (stored) return { ...stored };
    const listPos = this.computeSchemaListPosition(base);
    return {
      x: listPos.x + SELECTOR_LIST_WIDTH + TREE_LEVEL_GAP,
      y: listPos.y,
    };
  }

  private allocatePosition(
    nodeId: string,
    preferred: DiagramFlowPoint,
    width: number,
    height: number
  ): DiagramFlowPoint {
    const stored = this.positions.get(nodeId);
    if (stored) return { ...stored };

    let candidate = { ...preferred };
    for (let attempt = 0; attempt < 48; attempt++) {
      if (!this.intersectsAnyNode(nodeId, candidate, width, height)) {
        this.positions.set(nodeId, candidate);
        return candidate;
      }
      candidate = {
        x: candidate.x,
        y: candidate.y + height + NODE_COLLISION_PADDING,
      };
    }

    this.positions.set(nodeId, candidate);
    return candidate;
  }

  private intersectsAnyNode(
    nodeId: string,
    pos: DiagramFlowPoint,
    width: number,
    height: number
  ): boolean {
    const padding = 16;
    for (const [id, otherPos] of this.positions.entries()) {
      if (id === nodeId) continue;
      if (id.startsWith('erd:')) continue;
      const size = this.nodeSizeFor(id);
      if (
        this.rectsOverlap(
          pos.x,
          pos.y,
          width,
          height,
          otherPos.x,
          otherPos.y,
          size.width,
          size.height,
          padding
        )
      ) {
        return true;
      }
    }
    return false;
  }

  private nodeSizeFor(nodeId: string): { width: number; height: number } {
    if (nodeId === this.basesNodeId) return { width: 240, height: 280 };
    if (nodeId.startsWith('node-schemas-')) {
      return { width: 260, height: SELECTOR_LIST_HEIGHT };
    }
    if (nodeId.startsWith('node-schema-')) {
      return { width: 220, height: SCHEMA_BOX_HEIGHT };
    }
    if (nodeId.startsWith('node-tables-')) {
      return { width: 280, height: TABLES_CARD_HEIGHT };
    }
    if (nodeId.startsWith('node-operation-')) {
      return { width: OPERATION_CARD_WIDTH, height: 160 };
    }
    return { width: 260, height: 200 };
  }

  private rectsOverlap(
    ax: number,
    ay: number,
    aw: number,
    ah: number,
    bx: number,
    by: number,
    bw: number,
    bh: number,
    padding: number
  ): boolean {
    return (
      ax < bx + bw + padding &&
      ax + aw + padding > bx &&
      ay < by + bh + padding &&
      ay + ah + padding > by
    );
  }

  private closeAllOperationDetails(exceptId?: string): void {
    this.operations.update((list) =>
      list.map((o) => {
        if (exceptId && o.id === exceptId) return o;
        return o.detailOpen ? { ...o, detailOpen: false } : o;
      })
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

  private nextPosition(fromNodeId: string): DiagramFlowPoint {
    const from = this.positions.get(fromNodeId) ?? DEFAULT_POSITIONS[fromNodeId] ?? { x: 80, y: 100 };
    return { x: from.x + this.nodeSizeFor(fromNodeId).width + TREE_LEVEL_GAP, y: from.y };
  }

  private ensureStoredPosition(
    nodeId: string,
    preferred: DiagramFlowPoint,
    width: number,
    height: number
  ): void {
    if (!this.positions.has(nodeId)) {
      this.allocatePosition(nodeId, preferred, width, height);
    }
  }

  private resolveNodePosition(
    nodeId: string,
    preferred: DiagramFlowPoint,
    width: number,
    height: number
  ): DiagramFlowPoint {
    if (this.positions.has(nodeId)) {
      return { ...this.positions.get(nodeId)! };
    }
    return this.allocatePosition(nodeId, preferred, width, height);
  }

  private readPosition(nodeId: string, fallback: DiagramFlowPoint): DiagramFlowPoint {
    const stored = this.positions.get(nodeId);
    return stored ? { ...stored } : { ...fallback };
  }

  private connectorIds(nodeId: string): { source: string; target: string } {
    return { source: `${nodeId}::out`, target: `${nodeId}::in` };
  }

  private applyStoredLayout(): void {
    const stored = this.persistence.load();
    if (!stored) return;

    this.syncMode.set(stored.syncMode ?? 'estrutura');
    this.treeLayout.set(stored.treeLayout ?? 'vertical');
    this.selection.set(this.normalizePersistedSelection(stored.selection));

    for (const [nodeId, filter] of Object.entries(stored.filters ?? {})) {
      this.filters.set(nodeId, filter);
    }

    for (const [key, pos] of Object.entries(stored.positions ?? {})) {
      this.positions.set(key, { x: pos.x, y: pos.y });
      if (key.startsWith('node-') || key.startsWith('erd-')) {
        this.manualNodePositions.add(key);
      }
    }

    for (const base of stored.openSchemaListBases ?? []) {
      this.openSchemaListBases.add(base);
    }
    for (const key of stored.openSchemaBoxes ?? []) {
      this.openSchemaBoxes.add(key);
    }
    for (const key of stored.openTablesKeys ?? []) {
      this.openTablesKeys.add(key);
    }

    if (this.openSchemaListBases.size > 0) {
      this.layoutTreeBranches();
    }
  }

  private normalizePersistedSelection(selection: SyncDiagramContext): SyncDiagramContext {
    const sel = { ...selection };
    if (sel.tabela && !sel.tabelas?.length) {
      sel.tabelas = [sel.tabela];
      delete sel.tabela;
    }
    return sel;
  }

  private restoreDrillDownFromSelection(): void {
    const sel = this.selection();

    if (sel.base && !this.openSchemaListBases.has(sel.base)) {
      this.openSchemaListBases.add(sel.base);
    }
    if (sel.base && sel.esquema) {
      const key = schemaScopeKey(sel.base, sel.esquema);
      if (this.selectedTabelas(sel).length > 0 && !this.openTablesKeys.has(key)) {
        this.openTablesKeys.add(key);
      }
    }

    if (this.openSchemaListBases.size > 0) {
      this.layoutTreeBranches();
    }

    if (!sel.base) {
      this.rebuildGraph();
      this.loadingInitial.set(false);
      return;
    }

    const listId = this.schemasListNodeId(sel.base);
    if (this.schemaCache.has(sel.base)) {
      this.finishDrillDownRestore(sel);
      return;
    }

    this.loadingNodes.set(listId, true);
    this.rebuildGraph();

    this.baseService.findAll(`sincronizacao/base/esquema/${sel.base}`).subscribe({
      next: (res) => {
        const items = (res as string[]).map((name) => ({ id: name, label: name }));
        this.schemaCache.set(sel.base!, items);
        this.loadingNodes.set(listId, false);
        this.finishDrillDownRestore(sel);
      },
      error: () => {
        this.schemaCache.set(sel.base!, []);
        this.loadingNodes.set(listId, false);
        this.finishDrillDownRestore(sel);
      },
    });
  }

  private ensureSchemasLoaded(base: string): void {
    const listId = this.schemasListNodeId(base);
    const cached = this.schemaCache.get(base);
    if (cached) {
      this.rebuildGraph();
      this.persistSoon();
      return;
    }

    this.loadingNodes.set(listId, true);
    this.rebuildGraph();

    this.baseService.findAll(`sincronizacao/base/esquema/${base}`).subscribe({
      next: (res) => {
        const items = (res as string[]).map((name) => ({ id: name, label: name }));
        this.schemaCache.set(base, items);
        this.loadingNodes.set(listId, false);
        this.rebuildGraph();
        this.persistSoon();
      },
      error: () => {
        this.schemaCache.set(base, []);
        this.loadingNodes.set(listId, false);
        this.rebuildGraph();
        this.persistSoon();
      },
    });
  }

  private ensureSchemasAndTablesLoaded(base: string, esquema: string): void {
    const listId = this.schemasListNodeId(base);
    if (!this.schemaCache.has(base)) {
      this.loadingNodes.set(listId, true);
      this.rebuildGraph();
      this.baseService.findAll(`sincronizacao/base/esquema/${base}`).subscribe({
        next: (res) => {
          const items = (res as string[]).map((name) => ({ id: name, label: name }));
          this.schemaCache.set(base, items);
          this.loadingNodes.set(listId, false);
          this.ensureTablesLoaded(base, esquema);
        },
        error: () => {
          this.schemaCache.set(base, []);
          this.loadingNodes.set(listId, false);
          this.ensureTablesLoaded(base, esquema);
        },
      });
      return;
    }

    this.ensureTablesLoaded(base, esquema);
  }

  private ensureTablesLoaded(base: string, esquema: string): void {
    const key = schemaScopeKey(base, esquema);
    const nodeId = this.tablesNodeIdFor(base, esquema);
    if (this.tableCache.has(key)) {
      this.rebuildGraph();
      this.persistSoon();
      return;
    }

    this.loadingNodes.set(nodeId, true);
    this.rebuildGraph();

    this.baseService
      .findAll(`sincronizacao/base/tabela/${base}/${esquema}`)
      .subscribe({
        next: (res) => {
          const items = (res as string[]).map((name) => ({ id: name, label: name }));
          this.tableCache.set(key, items);
          this.loadingNodes.set(nodeId, false);
          this.rebuildGraph();
          this.persistSoon();
        },
        error: () => {
          this.tableCache.set(key, []);
          this.loadingNodes.set(nodeId, false);
          this.rebuildGraph();
          this.persistSoon();
        },
      });
  }

  private finishDrillDownRestore(sel: SyncDiagramContext): void {
    if (sel.base && sel.esquema && this.openTablesKeys.has(schemaScopeKey(sel.base, sel.esquema))) {
      const key = schemaScopeKey(sel.base, sel.esquema);
      const nodeId = this.tablesNodeIdFor(sel.base, sel.esquema);
      if (!this.tableCache.has(key)) {
        this.loadingNodes.set(nodeId, true);
        this.rebuildGraph();
        this.baseService
          .findAll(`sincronizacao/base/tabela/${sel.base}/${sel.esquema}`)
          .subscribe({
            next: (res) => {
              const items = (res as string[]).map((name) => ({ id: name, label: name }));
              this.tableCache.set(key, items);
              this.loadingNodes.set(nodeId, false);
              this.rebuildGraph();
              this.loadingInitial.set(false);
            },
            error: () => {
              this.tableCache.set(key, []);
              this.loadingNodes.set(nodeId, false);
              this.rebuildGraph();
              this.loadingInitial.set(false);
            },
          });
        return;
      }
    }

    this.rebuildGraph();
    this.loadingInitial.set(false);
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
      const pos = this.readPosition(table.id, { x: opPos.x + ERD_ORIGIN_OFFSET_X, y: opPos.y });
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
      selection: this.normalizePersistedSelection(this.selection()),
      filters: Object.fromEntries(this.filters.entries()),
      positions: this.toPersistablePositions(),
      openSchemaListBases: [...this.openSchemaListBases],
      openSchemaBoxes: [...this.openSchemaBoxes],
      openTablesKeys: [...this.openTablesKeys],
      treeLayout: this.treeLayout(),
    });
  }

  private toPersistablePositions(): Record<string, DiagramFlowPoint> {
    const out: Record<string, DiagramFlowPoint> = {};

    for (const [nodeId, pos] of this.positions.entries()) {
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

  private openedSchemaIdsForList(base: string): string[] {
    const opened: string[] = [];
    for (const key of this.openTablesKeys) {
      const parsed = this.parseScopeKey(key);
      if (parsed?.base === base) opened.push(parsed.esquema);
    }
    return opened.sort();
  }

  private rebuildGraph(): void {
    this.syncOperationAnchors();
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
    nodes.push(
      this.createSelectorNode(this.basesNodeId, basesMeta, DEFAULT_POSITIONS['node-bases'])
    );

    for (const base of this.openSchemaListBases) {
      const schemasNodeId = this.schemasListNodeId(base);
      const schemas = this.schemaCache.get(base) ?? [];
      const schemasMeta: SyncDiagramNodeData = {
        nodeId: schemasNodeId,
        kind: 'schemas',
        title: 'Schemas',
        subtitle: base,
        items: schemas,
        loading: this.loadingNodes.get(schemasNodeId) ?? false,
        filter: this.filters.get(schemasNodeId) ?? '',
        selectedItemId: sel.base === base ? sel.esquema : undefined,
        openedItemIds: this.openedSchemaIdsForList(base),
        context: { base },
        itemCount: schemas.length,
      };
      this.nodeMeta.set(schemasNodeId, schemasMeta);
      nodes.push(
        this.createSelectorNode(
          schemasNodeId,
          schemasMeta,
          this.resolveNodePosition(
            schemasNodeId,
            this.computeSchemaListPosition(base),
            260,
            SELECTOR_LIST_HEIGHT
          )
        )
      );
      connections.push(
        this.createSelectorConnection(
          this.basesNodeId,
          schemasNodeId,
          sel.base === base && !!sel.esquema,
          'Schemas'
        )
      );
    }

    for (const key of this.openSchemaBoxes) {
      if (this.openTablesKeys.has(key)) continue;
      const parsed = this.parseScopeKey(key);
      if (!parsed) continue;
      const { base, esquema } = parsed;
      const schemaNodeId = this.schemaBoxNodeId(base, esquema);
      const listId = this.schemasListNodeId(base);
      const schemaMeta: SyncDiagramNodeData = {
        nodeId: schemaNodeId,
        kind: 'schema',
        title: esquema,
        subtitle: base,
        items: [],
        loading: false,
        filter: '',
        openedItemId: this.openTablesKeys.has(key) ? esquema : undefined,
        context: { base, esquema },
        itemCount: 1,
      };
      this.nodeMeta.set(schemaNodeId, schemaMeta);
      nodes.push(
        this.createSelectorNode(
          schemaNodeId,
          schemaMeta,
          this.resolveNodePosition(
            schemaNodeId,
            this.computeSchemaBoxPosition(base, esquema),
            220,
            SCHEMA_BOX_HEIGHT
          )
        )
      );
      if (this.openSchemaListBases.has(base)) {
        connections.push(
          this.createSelectorConnection(listId, schemaNodeId, true, esquema)
        );
      } else {
        connections.push(
          this.createSelectorConnection(this.basesNodeId, schemaNodeId, true, esquema)
        );
      }
    }

    for (const key of this.openTablesKeys) {
      const parsed = this.parseScopeKey(key);
      if (!parsed) continue;
      const { base, esquema } = parsed;
      const tablesNodeId = this.tablesNodeIdFor(base, esquema);
      const tables = this.tableCache.get(key) ?? [];
      const selectedTables =
        sel.base === base && sel.esquema === esquema ? this.selectedTabelas(sel) : [];
      const tablesMeta: SyncDiagramNodeData = {
        nodeId: tablesNodeId,
        kind: 'tables',
        title: 'Tabelas',
        subtitle: `${base}.${esquema}`,
        items: tables,
        loading: this.loadingNodes.get(tablesNodeId) ?? false,
        filter: this.filters.get(tablesNodeId) ?? '',
        selectedItemIds: selectedTables,
        context: { base, esquema },
        itemCount: tables.length,
      };
      this.nodeMeta.set(tablesNodeId, tablesMeta);
      const fromId = this.tablesLinkFromId(base, esquema);
      nodes.push(
        this.createSelectorNode(
          tablesNodeId,
          tablesMeta,
          this.readPosition(
            tablesNodeId,
            this.computeTablesPosition(base, esquema)
          )
        )
      );
      connections.push(
        this.createSelectorConnection(
          fromId,
          tablesNodeId,
          selectedTables.length > 0,
          'Tabelas'
        )
      );
    }

    for (const op of this.operations()) {
      const opNodeId = this.operationNodeId(op.id);
      const fallback = this.computeOperationPosition(op.anchorNodeId, op.id);
      const opPos = this.resolveNodePosition(
        opNodeId,
        fallback,
        OPERATION_CARD_WIDTH,
        160
      );
      const connectors = this.connectorIds(opNodeId);
      nodes.push({
        id: opNodeId,
        type: 'operation',
        position: opPos,
        sourceConnectorId: connectors.source,
        targetConnectorId: connectors.target,
        operationMeta: op,
      });
      const anchorId = this.resolveEffectiveAnchorNodeId(op);
      connections.push({
        id: `edge-op-link-${anchorId}-${opNodeId}`,
        sourceId: this.connectorIds(anchorId).source,
        targetId: connectors.target,
        active:
          op.phase !== 'erro' &&
          op.phase !== 'cancelado' &&
          op.phase !== 'aguardando',
        kind: 'operation-link',
        label: this.operationEdgeLabel(op.action),
      });

      const erdTables = this.erdTablesForOperation(op.id);
      if (erdTables.length > 0) {
        for (const erd of erdTables) {
          const erdConnectors = this.connectorIds(erd.id);
          const erdPos = this.readPosition(erd.id, { x: opPos.x + ERD_ORIGIN_OFFSET_X, y: opPos.y });
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

    const validConnections = this.filterConnectionsWithVisibleEndpoints(nodes, connections);

    this.flowNodes.set(nodes);
    this.flowConnections.set(validConnections);
    this.flowConnectionLabels.set(this.buildConnectionLabels(nodes, validConnections));
  }

  private setLayoutPosition(nodeId: string, position: DiagramFlowPoint): void {
    if (this.manualNodePositions.has(nodeId)) return;
    this.positions.set(nodeId, position);
  }

  private collectVisibleSelectorNodeIds(): Set<string> {
    const ids = new Set<string>([this.basesNodeId]);
    for (const base of this.openSchemaListBases) {
      ids.add(this.schemasListNodeId(base));
    }
    for (const key of this.openSchemaBoxes) {
      if (this.openTablesKeys.has(key)) continue;
      const parsed = this.parseScopeKey(key);
      if (parsed) {
        ids.add(this.schemaBoxNodeId(parsed.base, parsed.esquema));
      }
    }
    for (const key of this.openTablesKeys) {
      const parsed = this.parseScopeKey(key);
      if (parsed) {
        ids.add(this.tablesNodeIdFor(parsed.base, parsed.esquema));
      }
    }
    return ids;
  }

  private isSelectorNodeVisible(nodeId: string): boolean {
    return this.collectVisibleSelectorNodeIds().has(nodeId);
  }

  private resolveEffectiveAnchorNodeId(op: SyncOperation): string {
    if (this.isSelectorNodeVisible(op.anchorNodeId)) {
      return op.anchorNodeId;
    }
    return this.resolveOperationAnchorNodeId(op.context);
  }

  private syncOperationAnchors(): void {
    const updates = new Map<string, string>();
    for (const op of this.operations()) {
      const effective = this.resolveEffectiveAnchorNodeId(op);
      if (effective !== op.anchorNodeId) {
        updates.set(op.id, effective);
      }
    }
    if (!updates.size) return;

    this.operations.update((list) =>
      list.map((op) => {
        const nextAnchor = updates.get(op.id);
        return nextAnchor ? { ...op, anchorNodeId: nextAnchor } : op;
      })
    );
  }

  private filterConnectionsWithVisibleEndpoints(
    nodes: DiagramFlowNode[],
    connections: DiagramFlowConnection[]
  ): DiagramFlowConnection[] {
    const connectorIds = new Set<string>();
    for (const node of nodes) {
      connectorIds.add(node.sourceConnectorId);
      connectorIds.add(node.targetConnectorId);
    }
    return connections.filter(
      (edge) => connectorIds.has(edge.sourceId) && connectorIds.has(edge.targetId)
    );
  }

  private scheduleGraphRebuild(): void {
    if (this.graphRebuildTimer) {
      clearTimeout(this.graphRebuildTimer);
    }
    this.graphRebuildTimer = setTimeout(() => {
      this.graphRebuildTimer = undefined;
      this.rebuildGraph();
    }, GRAPH_REBUILD_DELAY_MS);
  }

  private scheduleConnectionLabelsRefresh(): void {
    if (this.connectionLabelsTimer) {
      clearTimeout(this.connectionLabelsTimer);
    }
    this.connectionLabelsTimer = setTimeout(() => {
      this.connectionLabelsTimer = undefined;
      this.flowConnectionLabels.set(
        this.buildConnectionLabels(this.flowNodes(), this.flowConnections())
      );
    }, CONNECTION_LABELS_DELAY_MS);
  }

  private bumpErdData(): void {
    this.erdDataVersion.update((v) => v + 1);
  }

  private operationPatchRequiresGraphRebuild(patch: Partial<SyncOperation>): boolean {
    const keys = Object.keys(patch) as (keyof SyncOperation)[];
    if (!keys.length) return false;
    const lightweight: (keyof SyncOperation)[] = [
      'progress',
      'tabelaAtual',
      'errorsExpanded',
      'terminalLogs',
      'detailOpen',
    ];
    return keys.some((key) => !lightweight.includes(key));
  }

  private erdPatchRequiresGraphRebuild(patch: Partial<ErdTableNode>): boolean {
    return (
      'status' in patch ||
      'spotlightDim' in patch ||
      'mode' in patch ||
      'nome' in patch ||
      'operationId' in patch
    );
  }

  private buildConnectionLabels(
    nodes: DiagramFlowNode[],
    connections: DiagramFlowConnection[]
  ): DiagramFlowConnectionLabel[] {
    const posById = new Map<string, DiagramFlowPoint>();
    for (const node of nodes) {
      posById.set(node.id, node.position);
    }
    for (const [id, pos] of this.positions) {
      if (id.startsWith('node-')) {
        posById.set(id, pos);
      }
    }

    const labels: DiagramFlowConnectionLabel[] = [];
    for (const edge of connections) {
      if (!edge.label) continue;
      const sourceId = this.nodeIdFromConnector(edge.sourceId);
      const targetId = this.nodeIdFromConnector(edge.targetId);
      const sourcePos = posById.get(sourceId);
      const targetPos = posById.get(targetId);
      if (!sourcePos || !targetPos) continue;

      labels.push({
        id: `edge-label-${edge.id}`,
        position: {
          x: (sourcePos.x + OPERATION_CARD_WIDTH + targetPos.x) / 2 - 36,
          y: (sourcePos.y + FLOW_CARD_CENTER_Y + targetPos.y + FLOW_CARD_CENTER_Y) / 2 - 10,
        },
        text: edge.label,
      });
    }
    return labels;
  }

  private nodeIdFromConnector(connectorId: string): string {
    const idx = connectorId.lastIndexOf('::');
    return idx >= 0 ? connectorId.slice(0, idx) : connectorId;
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
      position: { ...(this.positions.get(id) ?? defaultPosition) },
      sourceConnectorId: connectors.source,
      targetConnectorId: connectors.target,
      selectorMeta: meta,
    };
  }

  private createSelectorConnection(
    sourceNodeId: string,
    targetNodeId: string,
    active: boolean,
    label?: string
  ): DiagramFlowConnection {
    const source = this.connectorIds(sourceNodeId);
    const target = this.connectorIds(targetNodeId);
    return {
      id: `edge-${sourceNodeId}-${targetNodeId}`,
      sourceId: source.source,
      targetId: target.target,
      active,
      kind: 'selector',
      label,
    };
  }

  private operationEdgeLabel(action: OperationActionKind): string {
    switch (action) {
      case 'verificar':
        return 'Verificar';
      case 'sincronizar':
        return 'Sincronizar';
      case 'verificar-sync':
        return 'Verificar + sync';
    }
  }
}
