import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { adminMiddleware } from '../../middlewares/admin.middleware';
import {
  listReviews,
  createReview,
  listPendingReviews,
  approveReview,
  deleteReview,
  replyToReview,
} from './reviews.controller';

const router = Router();

// Rotas públicas
router.get('/', listReviews);

// Rotas de usuário logado
router.post('/', authMiddleware, createReview);

// Rotas admin
router.get('/pending',        authMiddleware, adminMiddleware, listPendingReviews);
router.patch('/:id/approve',  authMiddleware, adminMiddleware, approveReview);
router.patch('/:id/reply',    authMiddleware, adminMiddleware, replyToReview);
router.delete('/:id',         authMiddleware, adminMiddleware, deleteReview);

export const reviewsRoutes = router;
