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

export type FlowNodeType = 'selector' | 'operation' | 'erd-table';

export interface SyncDiagramItem {
  id: string;
  label: string;
}

export interface SyncDiagramContext {
  base?: string;
  esquema?: string;
  tabela?: string;
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
  erdMeta?: ErdTableNode;
}

export interface DiagramFlowConnection {
  id: string;
  sourceId: string;
  targetId: string;
  active: boolean;
  kind: 'selector' | 'operation-link' | 'erd-fk';
}
