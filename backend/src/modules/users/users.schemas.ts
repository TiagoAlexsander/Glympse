import { z } from 'zod';

// Campos obrigatórios do endereço (alinhado com o backend createAddress)
export const createAddressSchema = z.object({
  recipient_name: z.string().trim().min(1, 'Informe o destinatário.').max(120),
  street:         z.string().trim().min(1, 'Informe a rua.').max(160),
  number:         z.string().trim().min(1, 'Informe o número.').max(20),
  neighborhood:   z.string().trim().min(1, 'Informe o bairro.').max(120),
  city:           z.string().trim().min(1, 'Informe a cidade.').max(120),
  state:          z.string().trim().min(1, 'Informe o estado.').max(40),
  zip_code:       z.string().trim().min(1, 'Informe o CEP.').max(20),
}).passthrough(); // demais campos (label, complemento, etc.) são opcionais e passam direto

// Atualização de perfil — todos opcionais
export const updateProfileSchema = z.object({
  first_name: z.string().trim().max(80).optional(),
  last_name:  z.string().trim().max(80).nullable().optional(),
  phone:      z.string().trim().max(30).nullable().optional(),
}).passthrough();
