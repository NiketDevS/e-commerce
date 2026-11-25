import 'dotenv/config';
import './config/env'; // Validates env vars on startup — will exit(1) if invalid
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './modules/auth/auth.routes';
import { ordersRouter } from './modules/orders/orders.routes';
import { ticketsRouter, staffTicketsRouter } from './modules/tickets/tickets.routes';
import { messagesRouter } from './modules/messages/messages.routes';
import { refundsRouter } from './modules/refunds/refunds.routes';
import { escalationsRouter } from './modules/escalations/escalations.routes';

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true, // Required for HttpOnly cookies across origins
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Health check (unauthenticated) ───────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Customer API Routes ────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/tickets/:ticketId/messages', messagesRouter);
app.use('/api/refunds', refundsRouter);

// ── Staff API Routes ───────────────────────────────────────────────────────────
app.use('/api/staff/tickets', staffTicketsRouter);
app.use('/api/staff/escalations', escalationsRouter);

// ── Centralized error handler (must be last) ──────────────────────────────────
app.use(errorHandler);

export { app };
