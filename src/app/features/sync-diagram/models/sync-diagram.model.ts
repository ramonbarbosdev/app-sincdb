import { EstruturaResponse } from '../../../components/estrutura-preview/estrutura-preview';

export type SyncDiagramKind = 'bases' | 'schemas' | 'tables';
export type SyncDiagramMode = 'estrutura' | 'dados';

export type OperationPhase =
  | 'verificando'
  | 'verificado'
  | 'sincronizando'
  | 'concluido'
  | 'erro'
  | 'cancelado';

export type OperationActionKind = 'verificar' | 'sincronizar' | 'verificar-sync';

export type TableVisualStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'created'
  | 'altered'
  | 'linked'
  | 'syncing'
  | 'done'
  | 'error';

export type ErdEdgeStatus = 'idle' | 'active' | 'done';

export type ColumnVisualStatus = 'idle' | 'running' | 'insert' | 'update' | 'done';

export type FlowNodeType = 'selector' | 'operation' | 'erd-zone' | 'erd-table';

export type ImpactChipKey =
  | 'created'
  | 'altered'
  | 'linked'
  | 'syncing'
  | 'insert'
  | 'update'
  | 'error';

export interface ImpactCategoryChip {
  key: ImpactChipKey;
  label: string;
  count: number;
}

export interface SyncDiagramItem {
  id: string;
  label: string;
}

export interface SyncDiagramContext {
  base?: string;
  esquema?: string;
  /** Legado — preferir `tabelas` para seleção múltipla. */
  tabela?: string;
  tabelas?: string[];
}

/** Chave única de escopo para reuso de caixa de operação (base + schema + modo + tabela opcional). */
export function operationScopeKey(context: SyncDiagramContext, mode: SyncDiagramMode): string {
  const base = context.base ?? '';
  const esquema = context.esquema ?? '';
  const tabela =
    context.tabela ?? (context.tabelas?.length === 1 ? context.tabelas[0] : '');
  if (tabela) {
    return `${base}|${esquema}|${tabela}|${mode}`;
  }
  return `${base}|${esquema}|${mode}`;
}

export interface SyncDiagramNodeData {
  nodeId: string;
  kind: SyncDiagramKind;
  title: string;
  subtitle?: string;
  items: SyncDiagramItem[];
  loading: boolean;
  filter: string;
  selectedItemId?: string;
  /** Seleção múltipla no card de tabelas. */
  selectedItemIds?: string[];
  context: SyncDiagramContext;
  itemCount?: number;
}

export type SyncDiagramAction =
  | 'close-children'
  | 'verify-estrutura'
  | 'sync-estrutura'
  | 'verify-dados'
  | 'sync-dados';

export interface TabelaAfetadaDTO {
  tabela?: string;
  acao?: string;
  erro?: string;
  linhaInseridas?: number;
  linhaAtualizadas?: number;
}

export interface SyncOperation {
  id: string;
  mode: SyncDiagramMode;
  action: OperationActionKind;
  context: SyncDiagramContext;
  phase: OperationPhase;
  progress: number;
  tabelaAtual?: string;
  label: string;
  detailOpen: boolean;
  errorsExpanded?: boolean;
  estruturaResponse?: EstruturaResponse;
  tabelasAfetadas?: TabelaAfetadaDTO[];
  errors?: string[];
}

export interface ColumnVisualState {
  nome: string;
  status: ColumnVisualStatus;
}

export interface ErdTableNode {
  id: string;
  operationId: string;
  nome: string;
  status: TableVisualStatus;
  columns: ColumnVisualState[];
  mode: SyncDiagramMode;
  spotlightDim?: boolean;
}

export interface ErdImpactZone {
  id: string;
  operationId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  chips: ImpactCategoryChip[];
  tableIds: string[];
}

export interface ErdEdge {
  id: string;
  operationId: string;
  sourceId: string;
  targetId: string;
  status: ErdEdgeStatus;
}

export interface DiagramFlowPoint {
  x: number;
  y: number;
}

export interface DiagramFlowNode {
  id: string;
  type: FlowNodeType;
  position: DiagramFlowPoint;
  sourceConnectorId: string;
  targetConnectorId: string;
  selectorMeta?: SyncDiagramNodeData;
  operationMeta?: SyncOperation;
  erdZoneMeta?: ErdImpactZone;
  erdMeta?: ErdTableNode;
}

export interface DiagramFlowConnection {
  id: string;
  sourceId: string;
  targetId: string;
  active: boolean;
  kind: 'selector' | 'operation-link' | 'erd-fk';
  label?: string;
}

export interface DiagramFlowConnectionLabel {
  id: string;
  position: DiagramFlowPoint;
  text: string;
}
