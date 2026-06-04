import { z } from 'zod';

export const ConexoesSchema = z.object({
  nm_conexao: z.string('O nome da conexao e obrigatorio').min(1, 'O nome da conexao e obrigatorio'),
  db_cloud_host: z.string('O host cloud e obrigatorio').min(1, 'O host cloud e obrigatorio'),
  db_cloud_port: z.string('A porta cloud e obrigatoria').min(1, 'A porta cloud e obrigatoria'),
  db_cloud_user: z.string('O usuario cloud e obrigatorio').min(1, 'O usuario cloud e obrigatorio'),
  db_cloud_password: z.string('A senha cloud e obrigatoria').min(1, 'A senha cloud e obrigatoria'),
  fl_admin: z.boolean(),
  db_local_host: z.string('O host local e obrigatorio').min(1, 'O host local e obrigatorio'),
  db_local_port: z.string('A porta local e obrigatoria').min(1, 'A porta local e obrigatoria'),
  db_local_user: z.string('O usuario local e obrigatorio').min(1, 'O usuario local e obrigatorio'),
  db_local_password: z.string('A senha local e obrigatoria').min(1, 'A senha local e obrigatoria'),
});

export const ConexaoSchema = z.array(ConexoesSchema);
