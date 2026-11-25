import { Router } from 'express';
import { getMessages, postMessage } from './messages.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router({ mergeParams: true }); // mergeParams to access :ticketId

router.get('/', authenticate, getMessages);
router.post('/', authenticate, postMessage);

export { router as messagesRouter };
