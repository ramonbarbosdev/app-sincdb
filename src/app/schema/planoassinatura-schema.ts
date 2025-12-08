import { z } from 'zod';

export const PlanoAssinaturasSchema = z.object({
  nm_planoassinatura: z.string('O Nome é obrigatório').min(1, 'O Nome é obrigatório'),
  
});

export const PlanoAssinaturaSchema = z.array(PlanoAssinaturasSchema);
