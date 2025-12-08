import { z } from 'zod';

export const ClientesSchema = z.object({
  tp_cliente: z
    .string('O Tipo de cliente é obrigatório')
    .min(1, 'O Tipo de cliente  é obrigatório'),
  nu_cpfcnpj: z.string('O CPF/CNPJ é obrigatório').min(1, 'O CPF/CNPJ é obrigatório'),
  nm_cliente: z.string('O nome é obrigatório').min(1, 'O nome é obrigatório'),
 
});

export const ClienteSchema = z.array(ClientesSchema);
