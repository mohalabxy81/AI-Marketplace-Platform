/**
 * Unified API Response Helpers — apps/web
 *
 * Provides consistent JSON response format across all API routes.
 * All responses follow: { data?, error?, meta? }
 */
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export type ApiSuccess<T> = {
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

/** 200 OK */
export function ok<T>(data: T, meta?: ApiSuccess<T>['meta']): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ data, meta }, { status: 200 });
}

/** 201 Created */
export function created<T>(data: T): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ data }, { status: 201 });
}

/** 400 Bad Request */
export function badRequest(message: string, details?: unknown): NextResponse<ApiError> {
  return NextResponse.json(
    { error: { code: 'BAD_REQUEST', message, details } },
    { status: 400 }
  );
}

/** 401 Unauthorized */
export function unauthorized(message = 'Authentication required'): NextResponse<ApiError> {
  return NextResponse.json(
    { error: { code: 'UNAUTHORIZED', message } },
    { status: 401 }
  );
}

/** 403 Forbidden */
export function forbidden(message = 'Insufficient permissions'): NextResponse<ApiError> {
  return NextResponse.json(
    { error: { code: 'FORBIDDEN', message } },
    { status: 403 }
  );
}

/** 404 Not Found */
export function notFound(message = 'Resource not found'): NextResponse<ApiError> {
  return NextResponse.json(
    { error: { code: 'NOT_FOUND', message } },
    { status: 404 }
  );
}

/** 429 Too Many Requests */
export function tooManyRequests(): NextResponse<ApiError> {
  return NextResponse.json(
    { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } },
    { status: 429 }
  );
}

/** 500 Internal Server Error */
export function internalError(error?: unknown): NextResponse<ApiError> {
  const isDev = process.env.NODE_ENV === 'development';
  const details = isDev && error instanceof Error ? error.message : undefined;

  if (error) {
    console.error('[API Error]', error);
  }

  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.', details } },
    { status: 500 }
  );
}

/** Handle Zod validation errors */
export function validationError(error: ZodError): NextResponse<ApiError> {
  return NextResponse.json(
    {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        details: error.flatten().fieldErrors,
      },
    },
    { status: 422 }
  );
}
