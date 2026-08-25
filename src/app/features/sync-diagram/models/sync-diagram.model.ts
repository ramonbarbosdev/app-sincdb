export type SyncDiagramKind = 'bases' | 'schemas' | 'tables';
export type SyncDiagramMode = 'estrutura' | 'dados';

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

export interface DiagramFlowPoint {
  x: number;
  y: number;
}

export interface DiagramFlowNode {
  id: string;
  meta: SyncDiagramNodeData;
  position: DiagramFlowPoint;
  sourceConnectorId: string;
  targetConnectorId: string;
}

export interface DiagramFlowConnection {
  id: string;
  sourceId: string;
  targetId: string;
  active: boolean;
}
