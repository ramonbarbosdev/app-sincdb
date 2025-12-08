export function ConverterNomeRole(roleName: string) {
  if (!roleName) return '';

  let semPrefixo = roleName.startsWith('ROLE_') ? roleName.slice(5) : roleName;

  let palavras = semPrefixo.toLowerCase().split('_');

  let nomeLegivel = palavras
    .filter((p) => p)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');

  return nomeLegivel;
}

export function ConverterNomeRoleMinusculo(roleName: string): string {
  if (!roleName) return '';

  const semPrefixo = roleName.startsWith('ROLE_') ? roleName.slice(5) : roleName;

  return semPrefixo.toLowerCase();
}
