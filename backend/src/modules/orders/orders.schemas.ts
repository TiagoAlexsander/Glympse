import { z } from 'zod';

const idLike = z.union([z.number(), z.string()]).refine(v => v !== '' && !isNaN(Number(v)), 'Valor inválido.');

export const createOrderSchema = z.object({
  address_id:         idLike,
  shipping_method_id: idLike,
  coupon_code:        z.string().trim().max(40).optional(),
});
