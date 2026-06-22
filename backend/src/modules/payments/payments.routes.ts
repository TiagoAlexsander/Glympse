import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import {
  createPixPayment,
  createCardPayment,
  simulatePayment,
  getPaymentStatus,
  webhook,
} from './payments.controller';

const router = Router();

// Webhook do gateway (sem autenticação — chamado pelo Mercado Pago)
router.post('/webhook', webhook);

// Rotas protegidas — usuário logado
router.get('/:orderId/status',   authMiddleware, getPaymentStatus);
router.post('/:orderId/pix',     authMiddleware, createPixPayment);
router.post('/:orderId/card',    authMiddleware, createCardPayment);
router.post('/:orderId/simulate',authMiddleware, simulatePayment);

export const paymentsRoutes = router;
