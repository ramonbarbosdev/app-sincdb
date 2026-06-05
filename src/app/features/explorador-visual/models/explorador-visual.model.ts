export type StatusComparacao = 'igual' | 'diferente' | 'ausente_destino' | 'novo_destino';

export type ModoVisualizacao = 'schema_completo' | 'tabela_focada' | 'apenas_diferencas';
export type ModoOperacao = 'explorar' | 'comparar';
export type AmbienteExplorador = 'cloud' | 'local';

export interface SelectOption {
  label: string;
  value: string;
}

export interface ConexaoExplorador {
  id?: string;
  id_conexao?: string;
  nm_conexao?: string;
  nome?: string;
  fl_padrao?: boolean;
}

export interface SchemaResumo {
  schema: string;
  totalTabelas: number;
  tabelasIguais: number;
  tabelasDiferentes: number;
  ausentesDestino: number;
  novasDestino: number;
  colunasDiferentes: number;
  status: StatusComparacao;
}

export interface ResumoComparacao {
  totalTabelas?: number;
  tabelasIguais?: number;
  tabelasDiferentes?: number;
  ausentesDestino?: number;
  novasDestino?: number;
  colunasDiferentes?: number;
  totalDiferencas?: number;
  [key: string]: number | string | undefined;
}

export interface DiagramResponse {
  base: string;
  schema: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  resumo: ResumoComparacao;
}

export interface DiagramNode {
  id: string;
  schema: string;
  nome: string;
  status: StatusComparacao;
  totalColunas: number;
  totalDiferencas: number;
  totalFks: number;
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  status: StatusComparacao;
  label?: string;
}

export interface TabelaDetalhe {
  id: string;
  schema: string;
  nome: string;
  status: StatusComparacao;
  colunas: ColunaDetalhe[];
  indices: IndiceDetalhe[];
  foreignKeys: ForeignKeyDetalhe[];
  observacoes: string[];
  sqlPreview: string;
}

export interface TabelaResumo {
  id: string;
  schema: string;
  nome: string;
  status?: StatusComparacao;
  totalColunas?: number;
  totalFks?: number;
}

export interface DadosTabelaPreview {
  colunas: string[];
  linhas: Record<string, unknown>[];
  limit?: number;
}

export interface ColunaDetalhe {
  nome: string;
  tipo: string;
  nullable?: boolean;
  primaryKey?: boolean;
  status?: StatusComparacao;
  observacao?: string;
}

export interface IndiceDetalhe {
  nome: string;
  colunas: string[];
  unique?: boolean;
  status?: StatusComparacao;
}

export interface ForeignKeyDetalhe {
  nome: string;
  coluna: string;
  tabelaReferencia: string;
  colunaReferencia?: string;
  status?: StatusComparacao;
}

export interface VflowNodeData {
  node: DiagramNode;
}
