import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ConverterNomeRoleMinusculo } from '../utils/ConverterNomeRole';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const auth = inject(AuthService);

  const rolesPermitidos = route.parent?.data?.['roles'] as string[] | undefined;
  const user = auth.getUserSubbject();

  if (!auth.getAccessToken()) {
    router.navigate(['/auth/access']);
    return false;
  }

  const role = user?.dsRole || user?.role || '';
  const userRole = ConverterNomeRoleMinusculo(role);

  if (userRole === '') {
    console.error('Nao existe formatacao equivalente para o ' + role);
  }

  const roles = rolesPermitidos?.map((r) => r.toLowerCase()) ?? ['dev'];
  const permitido = roles.includes(userRole);

  if (!permitido) {
    console.error('Usuario nao permitido [AUTH GUARD]');
    router.navigate(['/auth/access']);
    return false;
  }

  return true;
};
