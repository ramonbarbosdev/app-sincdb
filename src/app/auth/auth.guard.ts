import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { FormatarNomeRole } from '../utils/FormatarNomeRole';
import { ConverterNomeRoleMinusculo } from '../utils/ConverterNomeRole';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const auth = inject(AuthService);

  const rolesPermitidos = route.parent?.data?.['roles'] as string[] | undefined;
  const user = auth.getUserSubbject();

  if (!user?.login) {
    router.navigate(['/auth/access']);
    return false;
  }

  // OBS: lembrar de configurar o papel nas rotas
  const userRole = ConverterNomeRoleMinusculo(user.role);

  if(userRole === '')
  {
    console.error('Não existe formatação equivalente para o ' + user.role);
  }

  const roles = rolesPermitidos?.map((r) => r.toLowerCase()) ?? [ 'dev'];

  const permitido = roles.includes(userRole);

  if (!permitido) {
    console.error('Usuario não permitido [AUTH GUARD] ');
    router.navigate(['/auth/access']);
    return false;
  }

  return true;
};
