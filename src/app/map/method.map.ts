export const MethodIconMap: Record<string, string> = {
  GET: 'pi pi-eye',
  POST: 'pi pi-plus',
  PUT: 'pi pi-pencil',
  DELETE: 'pi pi-trash',
};

export const MethodMap: Record<string, string> = {
  GET: 'Visualizar',
  POST: 'Cadastrar',
  PUT: 'Atualizar',
  DELETE: 'Deletar',
};

// Função utilitária (opcional)
export function getDescricaoMethodMap(tipo: string): string {
  return MethodMap[tipo] || 'Não informado';
}
