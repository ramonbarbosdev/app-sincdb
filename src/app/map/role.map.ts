export const RoleMap: Record<string, string> = {
  ROLE_ADMIN: 'Administrador',
  ROLE_USER: 'Usuario',
  ROLE_TECNICO: 'Técnico',
};

// Função utilitária (opcional)
export function getDescricaoRoleMap(tipo: string): string {
  return RoleMap[tipo] || 'Não informado';
}
