export const OperacaoMap: Record<string, string> = {
  'ESTRUTURA': 'Estrutura',
  'DADOS': 'Dados',

  
};

// Função utilitária (opcional)
export function getOperacaoMap(tipo: string): string {
  return OperacaoMap[tipo] || 'Não informado';
}
