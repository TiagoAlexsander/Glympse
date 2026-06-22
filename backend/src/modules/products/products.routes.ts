import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { adminMiddleware } from '../../middlewares/admin.middleware';
import {
  listProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  listProductsAdmin,
  getProductAdmin,
  updateVariant,
  createProductFull,
  setProductCollections,
  addVariant,
  deleteVariant,
} from './products.controller';

const router = Router();

// ── Rotas admin (multi-segmento, vêm antes de /:slug para não conflitar) ──
router.get('/admin/list',                   authMiddleware, adminMiddleware, listProductsAdmin);
router.post('/admin/full',                  authMiddleware, adminMiddleware, createProductFull);
router.patch('/admin/variants/:variantId',  authMiddleware, adminMiddleware, updateVariant);
router.delete('/admin/variants/:variantId', authMiddleware, adminMiddleware, deleteVariant);
router.put('/admin/:id/collections',        authMiddleware, adminMiddleware, setProductCollections);
router.post('/admin/:id/variants',          authMiddleware, adminMiddleware, addVariant);
router.get('/admin/:id',                    authMiddleware, adminMiddleware, getProductAdmin);

// Rotas públicas — qualquer um pode ver
router.get('/',       listProducts);
router.get('/:slug',  getProductBySlug);

// Rotas admin de produto
router.post('/',      authMiddleware, adminMiddleware, createProduct);
router.put('/:id',    authMiddleware, adminMiddleware, updateProduct);
router.delete('/:id', authMiddleware, adminMiddleware, deleteProduct);

export const productsRoutes = router;
