/**
 * Utility per parsing JSON sicuro
 * Evita duplicazione del pattern try/catch in tutto il codebase
 */

/**
 * Parse JSON in modo sicuro, ritorna fallback in caso di errore
 */
export function safeParseJSON<T>(
  value: string | T | null | undefined,
  fallback: T
): T {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/**
 * Parse array JSON in modo sicuro
 */
export function safeParseJSONArray<T>(
  value: string | T[] | null | undefined
): T[] {
  return safeParseJSON(value, []);
}

/**
 * Parse object JSON in modo sicuro
 */
export function safeParseJSONObject<T extends object>(
  value: string | T | null | undefined,
  fallback: T
): T {
  return safeParseJSON(value, fallback);
}

/**
 * Stringify JSON in modo sicuro per storage
 */
export function safeStringifyJSON(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "null";
  }
}
