import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { listNotifications, markAsRead, markAllAsRead, deleteNotification } from './notifications.controller';

const router = Router();

router.use(authMiddleware);

router.get('/',              listNotifications);
router.patch('/read-all',    markAllAsRead);
router.patch('/:id/read',    markAsRead);
router.delete('/:id',        deleteNotification);

export const notificationsRoutes = router;
