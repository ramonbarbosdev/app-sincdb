export const StatusSincronizacaoMap: Record<string, string> = {
  'SINCRONIZADO': 'Sincronizado',
  'DESATUALIZADO': 'Desatualizado',
  'ERRO': 'Com Erro',
  'NAO_SINCRONIZADO': 'Não está sincronizado',
  'PROCESSANDO': 'Processando',
  'CANCELADO': 'Cancelado',
  
};

// Função utilitária (opcional)
export function getStatusSincronizadoMap(tipo: string): string {
  return StatusSincronizacaoMap[tipo] || 'Não informado';
}
