import { z } from 'zod';

export const CategoriasServicosSchema = z.object({
  cd_categoriaservico: z.string('O código é obrigatório').min(1, 'O código  é obrigatório'),
  nm_categoriaservico: z.string('O nome é obrigatório').min(1, 'O nome é obrigatório'),
});

export const CategoriasServicoSchema = z.array(CategoriasServicosSchema);
