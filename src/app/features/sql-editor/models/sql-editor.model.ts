export type SqlEnvironment = 'cloud' | 'local';

export type SqlEditorState = 'initial' | 'executing' | 'success' | 'error' | 'empty' | 'loaded';

export type SqlRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SqlExecutionRequest {
  ambiente: SqlEnvironment;
  conexaoId: string;
  base: string;
  sql: string;
  maxRows: number;
  timeoutSeconds: number;
  confirmado: boolean;
}

export interface SqlExecutionResponse {
  columns: SqlResultColumn[];
  rows: Record<string, unknown>[];
  executionTimeMs: number;
  affectedRows?: number;
  message?: string;
  requiresConfirmation?: boolean;
  riskLevel?: SqlRiskLevel;
}

export interface SqlResultColumn {
  name: string;
  type?: string;
}

export interface SqlCatalogColumn {
  name: string;
  type?: string;
}

export interface SqlCatalogTable {
  name: string;
  columns: SqlCatalogColumn[];
}

export interface SqlCatalogSchema {
  name: string;
  tables: SqlCatalogTable[];
}

export interface SqlCatalogResponse {
  schemas: SqlCatalogSchema[];
}

export interface ConexaoSqlOption {
  id?: string;
  id_conexao?: string;
  nm_conexao?: string;
  nome?: string;
  fl_padrao?: boolean;
}

export interface SqlHistoryItem {
  id: string;
  sql: string;
  ambiente: SqlEnvironment;
  base: string;
  executedAt: string;
  executionTimeMs?: number;
  affectedRows?: number;
  riskLevel?: SqlRiskLevel;
}

export interface SavedSqlQuery {
  id: string;
  name: string;
  sql: string;
  createdAt: string;
}

export interface SaveSqlQueryRequest {
  name: string;
  sql: string;
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface DangerousSqlCheck {
  dangerous: boolean;
  reason: string;
  riskLevel?: SqlRiskLevel;
}

export interface SqlMessage {
  severity: 'info' | 'success' | 'warn' | 'error';
  title: string;
  detail: string;
  timestamp: string;
}

export interface PendingSqlExecution {
  sql: string;
  reason: string;
  riskLevel: SqlRiskLevel;
}
