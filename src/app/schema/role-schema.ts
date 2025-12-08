import { z } from 'zod';

export const RolesSchema = z.object({
  nomeRole: z.string('O Nome é obrigatório').min(1, 'O Nome é obrigatório'),
});

export const RoleSchema = z.array(RolesSchema);
