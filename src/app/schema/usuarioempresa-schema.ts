import { z } from 'zod';

export const UsuariosEmpresasSchema = z.object({
  id_empresa: z.string('A empresa é obrigatório').min(1, 'A empresa é obrigatório'),
  
});

export const UsuariosEmpresaSchema = z.array(UsuariosEmpresasSchema);
