import { z } from 'zod';

export const ConexoesSchema = z.object({
  nm_conexao: z.string('O nome da conexao e obrigatorio').min(1, 'O nome da conexao e obrigatorio'),
   db_local_host: z
    .string()
    .min(1, 'O host é obrigatório'),

  db_local_port: z
    .string()
    .min(1, 'A porta é obrigatória'),

  db_local_user: z
    .string()
    .min(1, 'O usuário é obrigatório'),

  db_local_password: z
    .string()
    .min(1, 'A senha é obrigatória'),
  db_cloud_host: z
    .string()
    .min(1, 'O host é obrigatório'),

  db_cloud_port: z
    .string()
    .min(1, 'A porta é obrigatória'),

  db_cloud_user: z
    .string()
    .min(1, 'O usuário é obrigatório'),

  db_cloud_password: z
    .string()
    .min(1, 'A senha é obrigatória'),

  fl_padrao: z.boolean().optional(),

  fl_ativo: z.boolean().optional()
});

export const ConexaoSchema = z.array(ConexoesSchema);
