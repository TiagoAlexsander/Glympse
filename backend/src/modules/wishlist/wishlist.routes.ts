import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { getWishlist, addWishlistItem, removeWishlistItem, getWishlistIds } from './wishlist.controller';

const router = Router();

router.get('/',                    authMiddleware, getWishlist);
router.get('/ids',                 authMiddleware, getWishlistIds);
router.post('/items',              authMiddleware, addWishlistItem);
router.delete('/items/:variantId', authMiddleware, removeWishlistItem);

export const wishlistRoutes = router;
