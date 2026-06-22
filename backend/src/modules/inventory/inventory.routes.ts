import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { adminMiddleware } from '../../middlewares/admin.middleware';
import { createInventoryMovement, getInventory, listInventoryMovements, getStockSummary } from './inventory.controller';

const router = Router();

// Todas as rotas exigem admin
router.use(authMiddleware, adminMiddleware);

router.get('/',          getInventory);
router.get('/summary',   getStockSummary);
router.get('/movements', listInventoryMovements);
router.post('/movements', createInventoryMovement);

export const inventoryRoutes = router;
