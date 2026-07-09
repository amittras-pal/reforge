/**
 * Typed persistence errors surfaced to callers (FR-03.12). UI layers can catch these and show
 * `error.message` directly — messages are written to be user-meaningful (F-03 §6), e.g.
 * "Couldn't save — storage may be full."
 */
export class RepositoryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'RepositoryError'
  }
}

/** A write violated a basic data invariant, e.g. a `RoutineItem.exerciseId` that does not resolve. */
export class InvariantError extends RepositoryError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'InvariantError'
  }
}

/** A record the caller expected to exist could not be found. */
export class NotFoundError extends RepositoryError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'NotFoundError'
  }
}

/**
 * Normalizes an unknown thrown value into a `RepositoryError`. Typed errors thrown by the
 * repositories themselves (`InvariantError`, `NotFoundError`) pass through unchanged; anything
 * else (e.g. a raw Dexie/IndexedDB failure) is wrapped with a user-meaningful message.
 *
 * Dexie re-wraps errors that are thrown inside a `db.transaction(...)` callback into its own
 * `DexieError` when they cross the transaction boundary, which loses the original prototype
 * chain but preserves `.name`/`.message` — so those are also reconstructed here by name.
 */
export function toRepositoryError(err: unknown): RepositoryError {
  if (err instanceof RepositoryError) return err
  if (err instanceof Error) {
    if (err.name === 'NotFoundError')
      return new NotFoundError(err.message, { cause: err })
    if (err.name === 'InvariantError')
      return new InvariantError(err.message, { cause: err })
    if (err.name === 'QuotaExceededError') {
      return new RepositoryError("Couldn't save — storage may be full.", {
        cause: err,
      })
    }
  }
  const message = err instanceof Error ? err.message : 'Unknown error'
  return new RepositoryError(`Couldn't save: ${message}`, { cause: err })
}
