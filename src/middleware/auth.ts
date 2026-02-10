import type { Request, Response, NextFunction } from 'express';

export function apiKeyAuth(apiKey: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    const xKey = req.headers['x-api-key'];

    const token = header?.startsWith('Bearer ')
      ? header.slice(7)
      : typeof xKey === 'string'
        ? xKey
        : null;

    if (!apiKey || !token || token !== apiKey) {
      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Invalid or missing API key',
      });
      return;
    }
    next();
  };
}
