export type ExploradorStatus =
  | 'igual'
  | 'diferente'
  | 'ausente_destino'
  | 'novo_destino'
  | 'carregado'
  | 'comparado';

export interface ExploradorColuna {
  nome: string;
  tipo?: string;
  tamanho?: number;
  nullable?: boolean;
  primaryKey?: boolean;
  status?: ExploradorStatus;
}

export interface ExploradorIndice {
  nome: string;
  colunas: string[];
  unico: boolean;
  status?: ExploradorStatus;
}

export interface ExploradorForeignKey {
  nome: string;
  coluna: string;
  tabelaReferencia: string;
  colunaReferencia: string;
  status?: ExploradorStatus;
}

export interface ExploradorTabela {
  schema: string;
  nome: string;
  nomeCompleto: string;
  status?: ExploradorStatus | string;
  colunas: ExploradorColuna[];
  indices: ExploradorIndice[];
  foreignKeys: ExploradorForeignKey[];
}

export interface ExploradorSchema {
  nome: string;
  tabelas: ExploradorTabela[];
}

export interface ExploradorConexao {
  nome: string;
  tipo: string;
  status: string;
  schemas: ExploradorSchema[];
}

export interface ComparacaoColuna {
  nome: string;
  tipoOrigem?: string | null;
  tipoDestino?: string | null;
  primaryKeyOrigem?: boolean;
  primaryKeyDestino?: boolean;
  status: ExploradorStatus;
  observacao?: string | null;
}

export interface ComparacaoTabela {
  schema: string;
  nome: string;
  nomeCompleto: string;
  status: ExploradorStatus;
  colunas: ComparacaoColuna[];
  indices: ExploradorIndice[];
  foreignKeys: ExploradorForeignKey[];
  observacoes: string[];
}

export interface ComparacaoResumo {
  tabelasIguais: number;
  tabelasDiferentes: number;
  tabelasAusentesDestino: number;
  tabelasNovasDestino: number;
  colunasIguais: number;
  colunasDiferentes: number;
  colunasAusentesDestino: number;
  colunasNovasDestino: number;
  indicesDiferentes: number;
  foreignKeysDiferentes: number;
}

export interface ExploradorComparacao {
  tabelas: ComparacaoTabela[];
  resumo: ComparacaoResumo;
  sqlPreview: string[];
}

export interface ExploradorVisualResponse {
  base: string;
  esquema: string;
  geradoEm: string;
  origem: ExploradorConexao;
  destino: ExploradorConexao;
  comparacao: ExploradorComparacao;
}

export interface ExploradorNodeData {
  label: string;
  tabela: ExploradorTabela;
  comparacao?: ComparacaoTabela;
}
