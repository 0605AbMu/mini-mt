import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { logger } from '../services/logger';

// Custom error class for application errors
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error response interface
interface ErrorResponse {
  error: string;
  message?: string;
  details?: any;
  stack?: string;
}

// Handle Zod validation errors
const handleZodError = (error: ZodError): ErrorResponse => {
  const details = error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));

  return {
    error: "Validation Error",
    message: "Invalid input data",
    details,
  };
};

// Handle Prisma errors
const handlePrismaError = (
  error: Prisma.PrismaClientKnownRequestError,
): ErrorResponse => {
  switch (error.code) {
    case "P2002":
      return {
        error: "Duplicate Entry",
        message: "A record with this data already exists",
      };
    case "P2025":
      return {
        error: "Record Not Found",
        message: "The requested record was not found",
      };
    case "P2003":
      return {
        error: "Foreign Key Constraint",
        message: "Referenced record does not exist",
      };
    case "P2014":
      return {
        error: "Invalid ID",
        message: "The provided ID is invalid",
      };
    default:
      return {
        error: "Database Error",
        message: "A database error occurred",
      };
  }
};

// Global error handler middleware
export const globalErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  let statusCode = 500;
  let errorResponse: ErrorResponse = {
    error: "Internal Server Error",
    message: "Something went wrong",
  };

  // Handle different types of errors
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorResponse = {
      error: error.name,
      message: error.message,
    };
  } else if (error instanceof ZodError) {
    statusCode = 400;
    errorResponse = handleZodError(error);
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = 400;
    errorResponse = handlePrismaError(error);
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    errorResponse = {
      error: "Validation Error",
      message: "Invalid data provided to database",
    };
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === "development") {
    errorResponse.stack = error.stack;
  }

  // Log error for monitoring
  const logPayload = {
    err: error,
    req: { method: req.method, url: req.url, ip: req.ip },
    statusCode,
  };
  if (statusCode >= 500) {
    logger.error(logPayload, "Unhandled server error");
  } else {
    logger.warn(logPayload, "Request error");
  }

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper to catch async errors
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
};
