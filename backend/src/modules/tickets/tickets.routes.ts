import { Router } from 'express';
import {
  createTicket,
  getTickets,
  getTicket,
  updateTicket,
  getStaffTickets,
  getStaffTicket,
  updateStaffTicket,
  addNote,
} from './tickets.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

// Customer ticket routes
const customerRouter = Router();
customerRouter.post('/', authenticate, authorize(['CUSTOMER']), createTicket);
customerRouter.get('/', authenticate, authorize(['CUSTOMER']), getTickets);
customerRouter.get('/:id', authenticate, authorize(['CUSTOMER']), getTicket);
customerRouter.patch('/:id', authenticate, authorize(['CUSTOMER']), updateTicket);

// Staff ticket routes (mounted under /api/staff)
const staffRouter = Router();
staffRouter.get('/', authenticate, authorize(['SUPPORT_AGENT', 'ADMIN']), getStaffTickets);
staffRouter.get('/:id', authenticate, authorize(['SUPPORT_AGENT', 'ADMIN']), getStaffTicket);
staffRouter.patch('/:id', authenticate, authorize(['SUPPORT_AGENT', 'ADMIN']), updateStaffTicket);
staffRouter.post('/:id/notes', authenticate, authorize(['SUPPORT_AGENT', 'ADMIN']), addNote);

export { customerRouter as ticketsRouter, staffRouter as staffTicketsRouter };
