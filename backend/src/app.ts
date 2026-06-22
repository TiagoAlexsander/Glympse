import 'dotenv/config';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { adminRoutes } from './modules/admin/admin.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { cartRoutes } from './modules/cart/cart.routes';
import { categoriesRoutes } from './modules/categories/categories.routes';
import { collectionsRoutes } from './modules/collections/collections.routes';
import { inventoryRoutes } from './modules/inventory/inventory.routes';
import { notificationsRoutes } from './modules/notifications/notifications.routes';
import { ordersRoutes } from './modules/orders/orders.routes';
import { paymentsRoutes } from './modules/payments/payments.routes';
import { productsRoutes } from './modules/products/products.routes';
import { returnsRoutes } from './modules/returns/returns.routes';
import { reviewsRoutes } from './modules/reviews/reviews.routes';
import { shipmentsRoutes } from './modules/shipments/shipments.routes';
import { usersRoutes } from './modules/users/users.routes';
import { wishlistRoutes } from './modules/wishlist/wishlist.routes';
import { apiLimiter } from './middlewares/rate-limit.middleware';

const app = express();
const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean);

// Confia no proxy (necessário para o rate-limit identificar o IP em produção/Render)
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Limite geral de requisições (proteção básica contra abuso)
app.use('/api', apiLimiter);

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: { status: 'ok' },
  });
});

app.use('/auth',        authRoutes);
app.use('/api/auth',    authRoutes); // alias para manter o padrão /api/* das outras rotas
app.use('/api/admin',   adminRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/collections', collectionsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders',        ordersRoutes);
app.use('/api/payments',      paymentsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/shipments',     shipmentsRoutes);
app.use('/api/reviews',       reviewsRoutes);
app.use('/api/returns',       returnsRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada.',
  });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor.',
  });
});

export { app };
