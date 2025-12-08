import { z } from 'zod';

export const UsuariosEmpresasSchema = z.object({
  id_empresa: z.preprocess((val) => {
    if (typeof val === 'string') {
      const num = Number(val);
      return isNaN(num) ? null : num;
    }
    if (typeof val === 'number') return val;
    return null;
  }, z.number('A empresa é obrigatório').min(1, 'A empresa é obrigatório')),
});

export const UsuariosEmpresaSchema = z.array(UsuariosEmpresasSchema);
