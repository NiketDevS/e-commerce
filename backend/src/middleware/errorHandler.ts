import { Request, Response, NextFunction } from 'express';

type HttpError = Error & {
  statusCode?: number;
  code?: string;
};

export function errorHandler(
  err: HttpError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? 500;
  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'An internal error occurred'
      : err.message;

  // Never log full errors in production — only log unexpected ones
  if (statusCode >= 500) {
    console.error('[ERROR]', err.message, err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    code: err.code ?? 'INTERNAL_ERROR',
  });
}

/**
 * Creates a typed application error with HTTP status and machine-readable code.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
