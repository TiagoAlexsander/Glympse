import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { adminMiddleware } from '../../middlewares/admin.middleware';
import { listCollections, listCollectionsAdmin, listCollectionProducts, createCollection, updateCollection, deleteCollection, addProductToCollection, removeProductFromCollection } from './collections.controller';

const router = Router();

// Lista pública de coleções ativas (para a vitrine) — sem auth
router.get('/public',          listCollections);
router.get('/admin/all',       authMiddleware, adminMiddleware, listCollectionsAdmin);
router.get('/',                authMiddleware, adminMiddleware, listCollections);
router.get('/:id/products',    listCollectionProducts);
router.post('/',               authMiddleware, adminMiddleware, createCollection);
router.post('/:id/products',                  authMiddleware, adminMiddleware, addProductToCollection);
router.delete('/:id/products/:productId',     authMiddleware, adminMiddleware, removeProductFromCollection);
router.put('/:id',             authMiddleware, adminMiddleware, updateCollection);
router.delete('/:id',          authMiddleware, adminMiddleware, deleteCollection);

export const collectionsRoutes = router;
