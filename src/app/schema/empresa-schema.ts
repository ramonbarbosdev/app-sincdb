import { z } from 'zod';

export const EmpresasSchema = z.object({
  cd_empresa: z.string('O Código é obrigatório').min(1, 'O Código é obrigatório'),
  nm_empresa: z.string('O Nome é obrigatório').min(1, 'O Nome é obrigatório'),
  id_planoassinatura: z.preprocess((val) => {
    if (typeof val === 'string') {
      const num = Number(val);
      return isNaN(num) ? null : num;
    }
    if (typeof val === 'number') return val;
    return null;
  }, z.number('O Plano é obrigatório').min(1, 'O Plano é obrigatório')),
});

export const EmpresaSchema = z.array(EmpresasSchema);
