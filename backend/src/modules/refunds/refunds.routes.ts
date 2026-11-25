import { Router } from 'express';
import { createRefund, getRefunds, getRefund } from './refunds.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.post('/', authenticate, authorize(['CUSTOMER']), createRefund);
router.get('/', authenticate, authorize(['CUSTOMER']), getRefunds);
router.get('/:id', authenticate, authorize(['CUSTOMER']), getRefund);

export { router as refundsRouter };
