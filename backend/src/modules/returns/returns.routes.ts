import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { adminMiddleware } from '../../middlewares/admin.middleware';
import { createReturn, getReturn, listAllReturns, listReturns, updateReturnStatus } from './returns.controller';

const router = Router();

// Usuário logado
router.use(authMiddleware);

router.get('/',    listReturns);
router.post('/',   createReturn);
router.get('/:id', getReturn);

// Admin
router.get('/admin/all',       adminMiddleware, listAllReturns);
router.patch('/:id/status',    adminMiddleware, updateReturnStatus);

export const returnsRoutes = router;
