import { Response } from 'express';

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  code: string;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  message?: string,
): Response {
  const body: ApiSuccess<T> = { success: true, data };
  if (message) body.message = message;
  return res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  statusCode: number,
  error: string,
  code: string,
): Response {
  const body: ApiError = { success: false, error, code };
  return res.status(statusCode).json(body);
}
