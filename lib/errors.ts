// lib/errors.ts
// Helpers for reading values off caught errors without `any`.

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

// Supabase errors are plain objects with a `message`, not Error instances.
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String(error.message);
  }
  return String(error);
}

export function errorStatus(error: unknown, fallback = 500): number {
  if (typeof error === "object" && error !== null && "status" in error && typeof error.status === "number") {
    return error.status;
  }
  return fallback;
}

export function isAbortError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}
