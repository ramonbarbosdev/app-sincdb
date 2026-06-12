export type SqlEnvironment = 'cloud' | 'local';

export type SqlEditorState = 'initial' | 'executing' | 'success' | 'error' | 'empty' | 'loaded';

export interface SqlExecutionRequest {
  ambiente: SqlEnvironment;
  conexaoId: string;
  base: string;
  sql: string;
}

export interface SqlExecutionResponse {
  columns: SqlResultColumn[];
  rows: Record<string, unknown>[];
  executionTimeMs: number;
  affectedRows?: number;
  message?: string;
}

export interface SqlResultColumn {
  name: string;
  type?: string;
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
}
