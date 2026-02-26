import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';

// Validation middleware factory for request body
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validationResult = schema.safeParse(req.body);
      
      if (!validationResult.success) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'Request body validation failed',
          details: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code
          }))
        });
        return;
      }
      
      // Replace req.body with validated and transformed data
      req.body = validationResult.data;
      next();
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        message: 'Validation middleware error'
      });
    }
  };
};

// Validation middleware factory for request parameters
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validationResult = schema.safeParse(req.params);
      
      if (!validationResult.success) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'Request parameters validation failed',
          details: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code
          }))
        });
        return;
      }
      
      // Replace req.params with validated and transformed data
      req.params = validationResult.data as any;
      next();
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        message: 'Validation middleware error'
      });
    }
  };
};

// Validation middleware factory for query parameters
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validationResult = schema.safeParse(req.query);
      
      if (!validationResult.success) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'Query parameters validation failed',
          details: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code
          }))
        });
        return;
      }
      
      // Replace req.query with validated and transformed data
      req.query = validationResult.data as any;
      next();
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        message: 'Validation middleware error'
      });
    }
  };
};

// Combined validation middleware for body, params, and query
export const validate = (options: {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate body if schema provided
      if (options.body) {
        const bodyValidation = options.body.safeParse(req.body);
        if (!bodyValidation.success) {
          res.status(400).json({
            error: 'Validation failed',
            message: 'Request body validation failed',
            details: bodyValidation.error.issues.map(issue => ({
              field: issue.path.join('.'),
              message: issue.message,
              code: issue.code
            }))
          });
          return;
        }
        req.body = bodyValidation.data;
      }

      // Validate params if schema provided
      if (options.params) {
        const paramsValidation = options.params.safeParse(req.params);
        if (!paramsValidation.success) {
          res.status(400).json({
            error: 'Validation failed',
            message: 'Request parameters validation failed',
            details: paramsValidation.error.issues.map(issue => ({
              field: issue.path.join('.'),
              message: issue.message,
              code: issue.code
            }))
          });
          return;
        }
        req.params = paramsValidation.data as any;
      }

      // Validate query if schema provided
      if (options.query) {
        const queryValidation = options.query.safeParse(req.query);
        if (!queryValidation.success) {
          res.status(400).json({
            error: 'Validation failed',
            message: 'Query parameters validation failed',
            details: queryValidation.error.issues.map(issue => ({
              field: issue.path.join('.'),
              message: issue.message,
              code: issue.code
            }))
          });
          return;
        }
        req.query = queryValidation.data as any;
      }

      next();
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        message: 'Validation middleware error'
      });
    }
  };
};

// Helper function to format Zod errors
export const formatZodError = (error: ZodError) => {
  return {
    error: 'Validation failed',
    message: 'Input validation failed',
    details: error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }))
  };
};