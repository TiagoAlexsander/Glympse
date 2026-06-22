import { Router } from 'express';
import { adminMiddleware } from '../../middlewares/admin.middleware';
import { authMiddleware } from '../../middlewares/auth.middleware';
import {
  deleteUser,
  getUserById,
  listUsers,
  updateUserRole,
  updateUserStatus,
  getDashboard,
} from './admin.controller';

const router = Router();

// Todas as rotas admin exigem: estar logado + ter role ADMIN
router.use(authMiddleware, adminMiddleware);

router.get('/dashboard',           getDashboard);
router.get('/users',               listUsers);
router.get('/users/:id',           getUserById);
router.patch('/users/:id/role',    updateUserRole);
router.patch('/users/:id/status',  updateUserStatus);
router.delete('/users/:id',        deleteUser);

export const adminRoutes = router;
