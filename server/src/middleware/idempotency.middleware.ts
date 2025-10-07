import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';

interface IdempotentRequest extends Request {
  idempotencyKey?: string;
}

export const idempotencyMiddleware = async (
  req: IdempotentRequest,
  res: Response,
  next: NextFunction
) => {
  // Only apply to POST/PUT/PATCH requests
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'] as string;
  
  if (!idempotencyKey) {
    return res.status(400).json({
      error: 'Idempotency-Key header is required for this operation',
      code: 'IDEMPOTENCY_KEY_REQUIRED'
    });
  }

  try {
    // Check if we've already processed this request
    const existingResponse = await redisClient.get(`idempotency:${idempotencyKey}`);
    
    if (existingResponse) {
      // Return the cached response
      const parsed = JSON.parse(existingResponse);
      return res.status(parsed.status).json(parsed.data);
    }

    // Store the idempotency key for 24 hours
    await redisClient.setEx(`idempotency:${idempotencyKey}`, 86400, 'processing');
    
    // Add the key to the request for later use
    req.idempotencyKey = idempotencyKey;
    
    next();
  } catch (error) {
    console.error('Idempotency middleware error:', error);
    return res.status(500).json({
      error: 'Failed to process idempotency check',
      code: 'IDEMPOTENCY_ERROR'
    });
  }
};

// Helper function to cache successful responses
export const cacheIdempotentResponse = async (
  idempotencyKey: string,
  status: number,
  data: any
) => {
  try {
    const response = JSON.stringify({ status, data });
    await redisClient.setEx(`idempotency:${idempotencyKey}`, 86400, response);
  } catch (error) {
    console.error('Failed to cache idempotent response:', error);
  }
};
