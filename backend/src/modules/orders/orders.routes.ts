import { Router } from 'express';
import { getOrders, getOrder } from './orders.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

// Customers only — staff uses a different route with richer context
router.get('/', authenticate, authorize(['CUSTOMER']), getOrders);
router.get('/:id', authenticate, authorize(['CUSTOMER']), getOrder);

export { router as ordersRouter };
