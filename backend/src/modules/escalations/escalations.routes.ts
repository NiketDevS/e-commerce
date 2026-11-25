import { Router } from 'express';
import { getEscalations, getEscalation, decideEscalation } from './escalations.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.get('/', authenticate, authorize(['SUPPORT_AGENT', 'ADMIN']), getEscalations);
router.get('/:id', authenticate, authorize(['SUPPORT_AGENT', 'ADMIN']), getEscalation);
router.post('/:id/decision', authenticate, authorize(['SUPPORT_AGENT', 'ADMIN']), decideEscalation);

export { router as escalationsRouter };
