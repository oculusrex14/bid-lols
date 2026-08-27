/**
 * Pure authorization error + mapping helpers (RC1, R4). Split out from
 * authz.ts so client-graph modules (capabilities, ProductShell) can reference
 * the error type WITHOUT pulling the server-only auth chain into the browser
 * (the import-protection gate denies .server modules there).
 */

export class AuthzError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AuthzError";
  }
}

/** Map AuthzError to a Response-friendly { status, body } at serverFn boundaries. */
export function toErrorResponse(err: unknown): {
  status: number;
  body: { code: string; message: string };
} | null {
  if (err instanceof AuthzError) {
    return {
      status: err.status,
      body: { code: err.code, message: err.message },
    };
  }
  return null;
}