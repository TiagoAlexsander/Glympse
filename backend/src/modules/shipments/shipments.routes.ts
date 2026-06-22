import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { adminMiddleware } from '../../middlewares/admin.middleware';
import { createShipment, getShipment, listShipments, updateShipment } from './shipments.controller';

const router = Router();

// Rastreio de um pedido (usuário logado)
router.get('/order/:orderId', authMiddleware, getShipment);

// Admin
router.get('/',    authMiddleware, adminMiddleware, listShipments);
router.post('/',   authMiddleware, adminMiddleware, createShipment);
router.patch('/:id', authMiddleware, adminMiddleware, updateShipment);

export const shipmentsRoutes = router;
