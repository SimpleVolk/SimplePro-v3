/**
 * Type definitions for Express Request with authenticated user
 */

import { Request as ExpressRequest } from 'express';

/**
 * Authenticated user information attached to request
 */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
  sessionId: string;
}

/**
 * Express Request with authenticated user
 */
export interface AuthenticatedRequest extends ExpressRequest {
  user: AuthenticatedUser;
}

/**
 * Global augmentation for Express namespace
 * Note: We extend the existing Express.User type from passport
 */
declare global {
  namespace Express {
    // Extend the existing User interface instead of Request
    // This is compatible with passport's type declarations
    type User = AuthenticatedUser;
  }
}
