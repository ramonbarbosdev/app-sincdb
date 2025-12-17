import { z } from 'zod';

export const ParametroMastersSchema = z.object({
  codigo: z
    .string('O Codigo é obrigatório')
    .min(1, 'O Codigo é obrigatório'),
  nomeChave: z.string('O Nome é obrigatório').min(1, 'O Nome é obrigatório'),

  tipo: z
    .string('O Tipo é obrigatório')
    .min(1, 'O Tipo é obrigatório'),
});

export const ParametroMasterSchema = z.array(ParametroMastersSchema);
