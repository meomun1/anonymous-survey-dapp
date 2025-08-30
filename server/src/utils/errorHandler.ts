import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export class AppError extends Error implements ApiError {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'INTERNAL_ERROR';
    this.details = details;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error types
export const createError = {
  badRequest: (message: string, details?: any) => 
    new AppError(message, 400, 'BAD_REQUEST', details),
  
  unauthorized: (message: string = 'Unauthorized') => 
    new AppError(message, 401, 'UNAUTHORIZED'),
  
  forbidden: (message: string = 'Forbidden') => 
    new AppError(message, 403, 'FORBIDDEN'),
  
  notFound: (message: string = 'Resource not found') => 
    new AppError(message, 404, 'NOT_FOUND'),
  
  conflict: (message: string, details?: any) => 
    new AppError(message, 409, 'CONFLICT', details),
  
  validation: (message: string, details?: any) => 
    new AppError(message, 422, 'VALIDATION_ERROR', details),
  
  tooManyRequests: (message: string = 'Too many requests') => 
    new AppError(message, 429, 'RATE_LIMIT_EXCEEDED'),
  
  internal: (message: string = 'Internal server error') => 
    new AppError(message, 500, 'INTERNAL_ERROR'),
};

// Error response formatter
export const formatErrorResponse = (error: ApiError) => {
  const response: any = {
    error: {
      message: error.message,
      code: error.code || 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
    }
  };

  if (error.details) {
    response.error.details = error.details;
  }

  if (process.env.NODE_ENV === 'development') {
    response.error.stack = error.stack;
  }

  return response;
};

// Global error handler middleware
export const errorHandler = (
  error: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Handle known application errors
  if (error instanceof AppError) {
    return res.status(error.statusCode).json(formatErrorResponse(error));
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json(formatErrorResponse(createError.unauthorized('Invalid token')));
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json(formatErrorResponse(createError.unauthorized('Token expired')));
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    return res.status(422).json(formatErrorResponse(createError.validation('Validation failed', error.message)));
  }

  // Handle database errors
  if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
    return res.status(422).json(formatErrorResponse(createError.validation('Database validation failed')));
  }

  // Default error response
  const defaultError = createError.internal();
  return res.status(defaultError.statusCode).json(formatErrorResponse(defaultError));
};

// Async error wrapper for controllers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
