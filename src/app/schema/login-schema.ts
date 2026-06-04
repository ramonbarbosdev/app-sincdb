import { z } from 'zod';

export const LoginsSchema = z.object({
  nuCpf: z.string('O CPF e obrigatorio').min(1, 'O CPF e obrigatorio'),
  dsSenha: z.string('A senha e obrigatoria').min(1, 'A senha e obrigatoria'),
});

export const LoginSchema = z.array(LoginsSchema);
