import { EstruturaResponse } from '../../../components/estrutura-preview/estrutura-preview';

export type SyncDiagramKind = 'bases' | 'schemas' | 'schema' | 'tables';
export type SyncDiagramMode = 'estrutura' | 'dados';
/** Disposição dos ramos ao abrir várias bases no canvas. */
export type SyncDiagramTreeLayout = 'vertical' | 'horizontal';

export type OperationPhase =
  | 'aguardando'
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

export interface SyncDiagramBreadcrumbItem {
  label: string;
  context: SyncDiagramContext;
}

export type SyncQueueItemStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'ERROR';

export interface SyncQueueItem {
  id: string;
  mode: SyncDiagramMode;
  context: SyncDiagramContext;
  label: string;
  createdAt: number;
  status?: SyncQueueItemStatus;
  errorMessage?: string;
}

/** Label de exibição na fila: `base.esquema` ou `base.esquema.tabela`. */
export function formatQueueItemLabel(context: SyncDiagramContext): string {
  const parts: string[] = [];
  if (context.base) parts.push(context.base);
  if (context.esquema) parts.push(context.esquema);
  const tabela =
    context.tabela ?? (context.tabelas?.length === 1 ? context.tabelas[0] : undefined);
  if (tabela) {
    const tableName = tabela.includes('.') ? tabela.split('.').pop()! : tabela;
    if (context.esquema && tableName !== context.esquema) {
      parts.push(tableName);
    }
  }
  return parts.length ? parts.join('.') : '—';
}

export function queueScopeKey(context: SyncDiagramContext, mode: SyncDiagramMode): string {
  return operationScopeKey(context, mode);
}

/** Chave única de escopo para reuso de caixa de operação (base + schema + modo + tabela opcional). */
export function schemaScopeKey(base: string, esquema: string): string {
  return `${base}|${esquema}`;
}

export function contextHasTableScope(context: SyncDiagramContext): boolean {
  const esquema = context.esquema ?? '';
  const tabela =
    context.tabela ?? (context.tabelas?.length === 1 ? context.tabelas[0] : '');
  if (!tabela) return false;
  if (tabela === esquema) return false;
  const tableName = tabela.includes('.') ? tabela.split('.').pop()! : tabela;
  return tableName !== esquema;
}

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

/** Exibição na caixa de operação: `schema.tabela` (sem base). */
export function formatOperationScopeSubtitle(context: SyncDiagramContext): string {
  const esquema = context.esquema ?? '';
  const tabela =
    context.tabela ?? (context.tabelas?.length === 1 ? context.tabelas[0] : '');
  if (!esquema) return '—';
  if (!tabela || tabela === esquema) return esquema;

  if (tabela.startsWith(`${esquema}.`)) return tabela;

  const segments = tabela.split('.');
  const tableName = segments.length > 1 ? segments[segments.length - 1] : tabela;
  if (segments.length > 1 && segments[0] === esquema) return tabela;

  return `${esquema}.${tableName}`;
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
  /** Legado — schema com tabelas abertas (card kind=schema). */
  openedItemId?: string;
  /** Schemas com caixa de tabelas aberta neste card (kind=schemas). */
  openedItemIds?: string[];
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

export type OperationLogLevel =
  | 'table'
  | 'error'
  | 'warn'
  | 'info'
  | 'ok'
  | 'skip'
  | 'done'
  | 'text';

export interface OperationLogEntry {
  level: OperationLogLevel;
  message: string;
  table?: string;
}

export interface OperationLogGroup {
  table?: string;
  lines: OperationLogEntry[];
  hasError: boolean;
}

const TERMINAL_LOG_PREFIX: Array<{ prefix: string; level: OperationLogLevel }> = [
  { prefix: '[TABLE]', level: 'table' },
  { prefix: '[ERROR]', level: 'error' },
  { prefix: '[WARN]', level: 'warn' },
  { prefix: '[INFO]', level: 'info' },
  { prefix: '[ OK ]', level: 'ok' },
  { prefix: '[SKIP]', level: 'skip' },
  { prefix: '[DONE]', level: 'done' },
];

export function parseTerminalLogLine(raw: string): OperationLogEntry | null {
  const line = raw.replace(/^\s+/, '').trim();
  if (!line) return null;

  for (const { prefix, level } of TERMINAL_LOG_PREFIX) {
    if (line.startsWith(prefix)) {
      const message = line.slice(prefix.length).trim();
      if (level === 'table') {
        return { level, message, table: message };
      }
      return { level, message };
    }
  }

  return { level: 'text', message: line };
}

export function groupOperationLogs(entries: OperationLogEntry[]): OperationLogGroup[] {
  const groups: OperationLogGroup[] = [];
  let current: OperationLogGroup | null = null;

  for (const entry of entries) {
    if (entry.level === 'table') {
      current = {
        table: entry.table ?? entry.message,
        lines: [],
        hasError: false,
      };
      groups.push(current);
      continue;
    }

    if (!current) {
      current = { lines: [], hasError: false };
      groups.push(current);
    }

    current.lines.push(entry);
    if (entry.level === 'error' || isLikelyErrorMessage(entry.message)) {
      current.hasError = true;
    }
  }

  return groups;
}

export function isLikelyErrorMessage(message: string): boolean {
  const text = message.toLowerCase();
  return (
    text.includes('não existe') ||
    text.includes('nao existe') ||
    text.includes('erro') ||
    text.includes('falha') ||
    text.includes('exception')
  );
}

export function countOperationLogErrors(
  entries: OperationLogEntry[],
  errors?: string[],
  tabelasAfetadas?: TabelaAfetadaDTO[]
): number {
  let count = entries.filter((e) => e.level === 'error').length;
  count += errors?.length ?? 0;
  count += tabelasAfetadas?.filter((t) => t.erro)?.length ?? 0;
  return count;
}

export interface SyncOperation {
  id: string;
  mode: SyncDiagramMode;
  action: OperationActionKind;
  context: SyncDiagramContext;
  anchorNodeId: string;
  queueItemId?: string;
  phase: OperationPhase;
  progress: number;
  tabelaAtual?: string;
  label: string;
  detailOpen: boolean;
  errorsExpanded?: boolean;
  estruturaResponse?: EstruturaResponse;
  tabelasAfetadas?: TabelaAfetadaDTO[];
  errors?: string[];
  terminalLogs?: OperationLogEntry[];
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
