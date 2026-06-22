import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { adminMiddleware } from '../../middlewares/admin.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createOrderSchema } from './orders.schemas';
import {
  createOrder,
  getOrderById,
  listOrders,
  listShippingMethods,
  cancelOrder,
  listAllOrders,
  getOrderByIdAdmin,
  updateOrderStatus,
} from './orders.controller';

const router = Router();

// Métodos de frete disponíveis (com cálculo de frete grátis baseado no carrinho)
router.get('/shipping-methods', authMiddleware, listShippingMethods);

// ── Rotas admin (devem vir antes de /:id para não conflitar) ──
router.get('/admin/all',          authMiddleware, adminMiddleware, listAllOrders);
router.get('/admin/:id',          authMiddleware, adminMiddleware, getOrderByIdAdmin);
router.patch('/admin/:id/status', authMiddleware, adminMiddleware, updateOrderStatus);

// ── Rotas do usuário logado ──
router.get('/',          authMiddleware, listOrders);
router.get('/:id',       authMiddleware, getOrderById);
router.post('/',         authMiddleware, validate(createOrderSchema), createOrder);
router.patch('/:id/cancel', authMiddleware, cancelOrder);

export const ordersRoutes = router;
