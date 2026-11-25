import { Request, Response, NextFunction } from 'express';
import { registerSchema, loginSchema } from './auth.schema';
import { authService } from './auth.service';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { env } from '../../config/env';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, parsed.error.errors[0].message, 'VALIDATION_ERROR');
      return;
    }

    const user = await authService.register(parsed.data);
    sendSuccess(res, user, 201, 'Account created successfully');
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, parsed.error.errors[0].message, 'VALIDATION_ERROR');
      return;
    }

    const { user, token } = await authService.login(parsed.data);
    res.cookie('token', token, COOKIE_OPTIONS);
    sendSuccess(res, user, 200);
  } catch (err) {
    next(err);
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
  });
  sendSuccess(res, null, 200, 'Logged out successfully');
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.getCurrentUser(req.user!.userId);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}
