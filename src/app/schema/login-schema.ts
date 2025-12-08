import { z } from 'zod';

export const LoginsSchema = z.object({
  login: z.string('O Login é obrigatório').min(1, 'O Login é obrigatório'),
  senha: z.string('A Senha é obrigatório').min(1, 'A Senha é obrigatório'),
});

export const LoginSchema = z.array(LoginsSchema);
