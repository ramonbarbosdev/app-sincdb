import { z } from 'zod';

export const RotasPermissoesSchema = z.object({
  path: z.string('A Rota é obrigatória').min(1, 'A Rota é obrigatória'),
});

export const RotaPermissaoSchema = z.array(RotasPermissoesSchema);
