import { z } from 'zod';

export const EstruturasSchema = z.object({
  base: z.string('A Base é obrigatório').min(1, 'A Base é obrigatório'),
  esquema: z.string('O Esquema é obrigatório').min(1, 'O Esquema é obrigatório'),
});

export const EstruturaSchema = z.array(EstruturasSchema);
