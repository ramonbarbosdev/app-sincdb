// ajuste o caminho conforme sua pasta

import { TipoRole } from '../enum/TipoRole'; // sem .ts


export function FormatarNomeRole(valor: any): any {
  if (valor && valor === TipoRole.ROLE_ADMIN) {
    return 'admin';
  }
  if (valor && valor === TipoRole.ROLE_DEV) {
    return 'dev';
  }
  return '';
}

export function FormatarNomeRoleComponente(valor: any): any {
  if (valor && valor === TipoRole.ROLE_DEV) {
    return 'Desenvolvedor';
  }
  if (valor && valor === TipoRole.ROLE_ADMIN) {
    return 'Administrador';
  }

  if (valor && valor === TipoRole.ROLE_USER) {
    return 'Usuario';
  }
  return '';
}
