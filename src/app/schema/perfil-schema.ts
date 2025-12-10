import { z } from 'zod';

export const PerfisSchema = z.object({
  nome: z.string('O Nome é obrigatório').min(1, 'O Nome é obrigatório'),
  // login: z.string('O Login é obrigatório').min(1, 'O Login é obrigatório'),
  // senha: z.string('O Senha é obrigatório').min(1, 'O Senha é obrigatório'),
  // role: z.string('O Acesso é obrigatório').min(1, 'O Acesso é obrigatório'),
  // cargo: z.string('O Acesso é obrigatório').min(1, 'O Acesso é obrigatório'),
});

export const PerfilSchema = z.array(PerfisSchema);
