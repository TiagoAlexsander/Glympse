import { Router } from 'express';
import { optionalAuthMiddleware } from '../../middlewares/auth.middleware';
import { authMiddleware } from '../../middlewares/auth.middleware';
import {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
  mergeCart,
  applyCoupon,
  removeCoupon,
} from './cart.controller';

const router = Router();

// Rotas que funcionam logado OU como guest (optionalAuth)
router.get('/',              optionalAuthMiddleware, getCart);
router.post('/items',        optionalAuthMiddleware, addCartItem);
router.patch('/items/:id',   optionalAuthMiddleware, updateCartItem);
router.delete('/items/:id',  optionalAuthMiddleware, removeCartItem);
router.delete('/',           optionalAuthMiddleware, clearCart);
router.post('/coupon',       optionalAuthMiddleware, applyCoupon);
router.delete('/coupon',     optionalAuthMiddleware, removeCoupon);

// Merge requer login obrigatório
router.post('/merge', authMiddleware, mergeCart);

export const cartRoutes = router;
