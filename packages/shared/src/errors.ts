export type ErrorDetails = Record<string, unknown> | undefined;

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: ErrorDetails;
  readonly expose: boolean;

  constructor(input: {
    statusCode: number;
    code: string;
    message: string;
    details?: ErrorDetails;
    expose?: boolean;
  }) {
    super(input.message);
    this.name = 'ApiError';
    this.statusCode = input.statusCode;
    this.code = input.code;
    this.details = input.details;
    this.expose = input.expose ?? input.statusCode < 500;
  }
}

export const badRequest = (code: string, message: string, details?: ErrorDetails) =>
  new ApiError({ statusCode: 400, code, message, details });

export const unauthorized = (
  code = 'AUTH_UNAUTHORIZED',
  message = 'Oturumunuz geçersiz veya süresi dolmuş.',
) => new ApiError({ statusCode: 401, code, message });

export const forbidden = (
  code = 'AUTH_FORBIDDEN',
  message = 'Bu işlem için yetkiniz bulunmuyor.',
) => new ApiError({ statusCode: 403, code, message });

export const notFound = (code = 'RESOURCE_NOT_FOUND', message = 'İstenen kaynak bulunamadı.') =>
  new ApiError({ statusCode: 404, code, message });

export const conflict = (code: string, message: string, details?: ErrorDetails) =>
  new ApiError({ statusCode: 409, code, message, details });

export const unavailable = (code: string, message: string) =>
  new ApiError({ statusCode: 503, code, message });
