// src/middleware/logging.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';

export const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  Logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    body: req.body,
    ip: req.ip
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    Logger.info(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });

  next();
};