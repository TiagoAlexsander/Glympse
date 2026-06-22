import { z } from 'zod';

export const registerSchema = z.object({
  first_name: z.string().trim().min(1, 'Informe o primeiro nome.').max(80),
  last_name:  z.string().trim().max(80).optional().or(z.literal('')),
  email:      z.string().trim().email('Email inválido.'),
  password:   z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.').max(72),
});

export const loginSchema = z.object({
  email:    z.string().trim().email('Email inválido.'),
  password: z.string().min(1, 'Informe a senha.'),
});
