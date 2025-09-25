// Error handling utilities for consistent error management

export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  context?: Record<string, any>;
  userMessage?: string;
  isRetryable?: boolean;
}

export class BeBrahmaError extends Error implements AppError {
  code: string;
  statusCode: number;
  context: Record<string, any>;
  userMessage: string;
  isRetryable: boolean;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode: number = 500,
    context: Record<string, any> = {},
    userMessage?: string,
    isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'BeBrahmaError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.userMessage = userMessage || message;
    this.isRetryable = isRetryable;
  }
}

// Error codes for different types of errors
export const ERROR_CODES = {
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  CORS_ERROR: 'CORS_ERROR',
  
  // API errors
  API_ERROR: 'API_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  
  // Data errors
  DATA_NOT_FOUND: 'DATA_NOT_FOUND',
  DATA_INVALID: 'DATA_INVALID',
  DATA_CORRUPTED: 'DATA_CORRUPTED',
  
  // Component errors
  COMPONENT_ERROR: 'COMPONENT_ERROR',
  RENDER_ERROR: 'RENDER_ERROR',
  STATE_ERROR: 'STATE_ERROR',
  
  // User action errors
  USER_INPUT_ERROR: 'USER_INPUT_ERROR',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  
  // System errors
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  FEATURE_UNAVAILABLE: 'FEATURE_UNAVAILABLE'
} as const;

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

// Create specific error types
export function createNetworkError(message: string, context?: Record<string, any>): BeBrahmaError {
  return new BeBrahmaError(
    message,
    ERROR_CODES.NETWORK_ERROR,
    0,
    context,
    'Network connection failed. Please check your internet connection and try again.',
    true
  );
}

export function createAPIError(message: string, statusCode: number, context?: Record<string, any>): BeBrahmaError {
  const isRetryable = statusCode >= 500 || statusCode === 429;
  let userMessage = 'An error occurred while processing your request.';
  
  if (statusCode === 401) {
    userMessage = 'Please log in to continue.';
  } else if (statusCode === 403) {
    userMessage = 'You do not have permission to perform this action.';
  } else if (statusCode === 404) {
    userMessage = 'The requested resource was not found.';
  } else if (statusCode === 429) {
    userMessage = 'Too many requests. Please wait a moment and try again.';
  } else if (statusCode >= 500) {
    userMessage = 'Server error. Please try again later.';
  }

  return new BeBrahmaError(
    message,
    ERROR_CODES.API_ERROR,
    statusCode,
    context,
    userMessage,
    isRetryable
  );
}

export function createValidationError(message: string, field?: string, context?: Record<string, any>): BeBrahmaError {
  return new BeBrahmaError(
    message,
    ERROR_CODES.VALIDATION_ERROR,
    400,
    { ...context, field },
    `Validation failed: ${message}`,
    false
  );
}

export function createUserInputError(message: string, field?: string, context?: Record<string, any>): BeBrahmaError {
  return new BeBrahmaError(
    message,
    ERROR_CODES.USER_INPUT_ERROR,
    400,
    { ...context, field },
    message,
    false
  );
}

// Error handling functions
export function handleError(error: unknown, context?: Record<string, any>): AppError {
  // If it's already our custom error, return it
  if (error instanceof BeBrahmaError) {
    return error;
  }

  // If it's a standard Error, convert it
  if (error instanceof Error) {
    return new BeBrahmaError(
      error.message,
      ERROR_CODES.SYSTEM_ERROR,
      500,
      { ...context, originalError: error },
      'An unexpected error occurred. Please try again.',
      true
    );
  }

  // If it's a string, create an error
  if (typeof error === 'string') {
    return new BeBrahmaError(
      error,
      ERROR_CODES.SYSTEM_ERROR,
      500,
      context,
      error,
      true
    );
  }

  // Fallback for unknown error types
  return new BeBrahmaError(
    'Unknown error occurred',
    ERROR_CODES.SYSTEM_ERROR,
    500,
    { ...context, originalError: error },
    'An unexpected error occurred. Please try again.',
    true
  );
}

// Error logging (can be extended to send to external services)
export function logError(error: AppError, context?: Record<string, any>): void {
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
      context: { ...error.context, ...context }
    },
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown'
  };

  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.error('Error logged:', errorLog);
  }

  // In production, you might want to send this to an error reporting service
  // Example: Sentry.captureException(error, { extra: errorLog });
  
  // You could also send to your own logging endpoint
  // fetch('/api/logs/error', { method: 'POST', body: JSON.stringify(errorLog) });
}

// Error recovery strategies
export function canRecoverFromError(error: AppError): boolean {
  const isRetryable = error.isRetryable === true;
  const isNetworkError = error.code === ERROR_CODES.NETWORK_ERROR;
  const isTimeoutError = error.code === ERROR_CODES.TIMEOUT_ERROR;
  const isServerError = Boolean(error.statusCode && error.statusCode >= 500);
  
  return isRetryable || isNetworkError || isTimeoutError || isServerError;
}

export function getRetryDelay(error: AppError, attempt: number): number {
  // Exponential backoff with jitter
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds
  
  let delay = baseDelay * Math.pow(2, attempt - 1);
  
  // Add jitter (±25%)
  const jitter = delay * 0.25 * (Math.random() - 0.5);
  delay += jitter;
  
  return Math.min(delay, maxDelay);
}

// Error boundary error handler
export function handleErrorBoundaryError(error: Error, errorInfo: any): void {
  const appError = handleError(error, { errorInfo });
  logError(appError, { source: 'ErrorBoundary' });
}

// Async operation error wrapper
export function wrapAsyncOperation<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  context?: Record<string, any>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await operation(...args);
    } catch (error) {
      const appError = handleError(error, { ...context, operationArgs: args });
      logError(appError);
      throw appError;
    }
  };
}
