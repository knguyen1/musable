import type { NextFunction, Request, Response } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import config from '../config/config.js';

const rateLimiter = new RateLimiterMemory({
  keyPrefix: 'musable',
  points: config.rateLimitMaxRequests,
  duration: Math.floor(config.rateLimitWindowMs / 1000),
});

export const rateLimiterMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const key = req.ip || 'unknown';
    await rateLimiter.consume(key);
    next();
  } catch (rejRes: unknown) {
    const rejection = rejRes as
      | { remainingPoints?: number; msBeforeNext?: number }
      | undefined;
    const remainingPoints = rejection?.remainingPoints || 0;
    const msBeforeNext = rejection?.msBeforeNext || 0;

    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests',
        retryAfter: Math.round(msBeforeNext / 1000),
        remainingPoints,
      },
    });
  }
};

export { rateLimiterMiddleware as rateLimiter };
