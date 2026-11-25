import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse';

/**
 * Role-based access control middleware.
 * Usage: router.get('/path', authenticate, authorize(['SUPPORT_AGENT', 'ADMIN']), handler)
 */
export function authorize(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 401, 'Authentication required', 'UNAUTHENTICATED');
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(res, 403, 'Insufficient permissions', 'FORBIDDEN');
      return;
    }

    next();
  };
}
