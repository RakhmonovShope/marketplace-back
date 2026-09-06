/**
 * API xato kodlari. Frontend MATNNI emas, `code` ni tekshiradi (matn i18n bilan almashadi).
 *
 * Ishlatish:
 *   throw new ConflictException({ code: ERR.ROLE_IN_USE, message: 'Role is assigned to 3 user(s)' });
 * `code` berilmasa `AllExceptionsFilter` HTTP statusdan umumiy kodni qo'yadi (codeForStatus).
 */
export const ERR = {
  // Umumiy (status bo'yicha)
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',

  // Ma'lumotlar bazasi (Prisma)
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  RELATED_NOT_FOUND: 'RELATED_NOT_FOUND',
  DATABASE_ERROR: 'DATABASE_ERROR',

  // Auth
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  SESSION_REVOKED: 'SESSION_REVOKED',
  TOKEN_REUSE: 'TOKEN_REUSE',
  TOKEN_INVALID: 'TOKEN_INVALID',

  // Domen
  ROLE_IN_USE: 'ROLE_IN_USE',
  SYSTEM_ROLE: 'SYSTEM_ROLE',
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',
  FILTER_FIELD_NOT_ALLOWED: 'FILTER_FIELD_NOT_ALLOWED',
} as const;

export type ErrorCode = (typeof ERR)[keyof typeof ERR];

/** HTTP statusdan umumiy kod — exception'da aniq `code` berilmagan hollar uchun. */
export const codeForStatus = (status: number): ErrorCode => {
  switch (status) {
    case 400:
      return ERR.BAD_REQUEST;
    case 401:
      return ERR.UNAUTHORIZED;
    case 403:
      return ERR.FORBIDDEN;
    case 404:
      return ERR.NOT_FOUND;
    case 409:
      return ERR.CONFLICT;
    case 413:
      return ERR.PAYLOAD_TOO_LARGE;
    case 429:
      return ERR.RATE_LIMITED;
    default:
      return status >= 500 ? ERR.INTERNAL_ERROR : ERR.BAD_REQUEST;
  }
};
