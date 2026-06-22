import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { adminMiddleware } from '../../middlewares/admin.middleware';
import { listCategories, createCategory, updateCategory, deleteCategory } from './categories.controller';

const router = Router();

router.get('/',       listCategories);
router.post('/',      authMiddleware, adminMiddleware, createCategory);
router.put('/:id',    authMiddleware, adminMiddleware, updateCategory);
router.delete('/:id', authMiddleware, adminMiddleware, deleteCategory);

export const categoriesRoutes = router;
