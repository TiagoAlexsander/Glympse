import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createAddressSchema, updateProfileSchema } from './users.schemas';
import {
  getCurrentUser,
  updateCurrentUser,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from './users.controller';

const router = Router();

// Perfil do usuario logado
router.get('/me',    authMiddleware, getCurrentUser);
router.patch('/me',  authMiddleware, validate(updateProfileSchema), updateCurrentUser);

// Enderecos do usuario logado
router.get('/me/addresses',         authMiddleware, getAddresses);
router.post('/me/addresses',        authMiddleware, validate(createAddressSchema), createAddress);
router.put('/me/addresses/:id',     authMiddleware, updateAddress);
router.delete('/me/addresses/:id',  authMiddleware, deleteAddress);

export const usersRoutes = router;
