import { Request, Response, NextFunction } from 'express';

/**
 * Middleware that sets the X-API-Version header on every response.
 * The version value is the major version taken from the package.json "version" field
 * (e.g. "1.0.0" → "1"), loaded once at startup so there is no per-request I/O.
 */

import { version } from '../../package.json';

const majorVersion = version.split('.')[0] ?? '1';

export const API_VERSION_HEADER = 'X-API-Version';

export function apiVersion(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader(API_VERSION_HEADER, majorVersion);
  next();
}
