import { Prisma } from '@prisma/client';

const CATEGORIES = {
  P1000: 'authentication', P1001: 'connection_unavailable', P1002: 'connection_timeout',
  P1003: 'database_missing', P1008: 'operation_timeout', P1010: 'access_denied',
  P1011: 'tls', P1017: 'connection_closed', P2002: 'unique_constraint',
  P2003: 'foreign_key', P2010: 'raw_query_failure', P2021: 'schema_missing',
  P2022: 'schema_missing', P2024: 'pool_timeout', P2025: 'record_missing',
  P2028: 'transaction_failure', P2034: 'transaction_conflict',
} as const;
type Category = typeof CATEGORIES[keyof typeof CATEGORIES] | 'validation' | 'engine_failure' | 'unknown';
export type SafeDatabaseEvent = Readonly<{
  event: 'database_failure'; eventId: string; timestamp: string;
  severity: 'error' | 'warn'; source: 'engine_unattributed' | 'operation';
  category: Category;
}>;

/** Inspect only public error class and own scalar code. Never messages/meta/stacks.
 * Codes classify an operation failure; they are NOT billing/ownership authority.
 */
export function classifyDatabaseFailure(error: unknown): Category {
  try {
    if (error instanceof Prisma.PrismaClientValidationError) return 'validation';
    if (error instanceof Prisma.PrismaClientRustPanicError) return 'engine_failure';
    const key = error instanceof Prisma.PrismaClientKnownRequestError ? 'code'
      : error instanceof Prisma.PrismaClientInitializationError ? 'errorCode' : null;
    if (!key) return 'unknown';
    const code: unknown = Object.getOwnPropertyDescriptor(error, key)?.value;
    return typeof code === 'string' && Object.hasOwn(CATEGORIES, code)
      ? CATEGORIES[code as keyof typeof CATEGORIES] : 'unknown';
  } catch { return 'unknown'; }
}

/** No arbitrary input becomes output, including event payloads and timestamps.
 * IDs belong to events only: no request, tenant or transaction correlation claim.
 * Stateless: log consumers may aggregate by the finite category/severity/source.
 */
export function createSafeDatabaseLogger(sink: (event: SafeDatabaseEvent) => void) {
  function emit(severity: 'error' | 'warn', source: SafeDatabaseEvent['source'], category: Category) {
    try {
      const event: SafeDatabaseEvent = Object.freeze({
        event: 'database_failure', eventId: globalThis.crypto.randomUUID(), timestamp: new Date().toISOString(),
        severity, source, category,
      });
      // Logging must not replace the original database result/error. No raw fallback.
      sink(event);
    } catch { /* logger/sink failure is contained, with no raw fallback */ }
  }
  return {
    engineError: () => emit('error', 'engine_unattributed', 'unknown'),
    engineWarning: () => emit('warn', 'engine_unattributed', 'unknown'),
    operationFailure: (error: unknown) => emit('error', 'operation', classifyDatabaseFailure(error)),
  };
}

// One safe sink for engine, query and transaction-start failures. No payload or
// environment inspection; do not add console fallbacks containing caught errors.
export const databaseLogger = createSafeDatabaseLogger(event => {
  if (event.severity === 'warn') console.warn(event);
  else console.error(event);
});
