/**
 * Public surface of the persistence layer (F-03). UI/feature code should import from here
 * rather than reaching into `database.ts`/individual repository files directly (FR-00.2).
 */
export { db, ReforgeDatabase } from './database'
export { SCHEMA_VERSION } from './schema-version'
export { resetAll } from './reset'
export { liveQueryStore } from './reactive'
export {
  RepositoryError,
  InvariantError,
  NotFoundError,
  toRepositoryError,
} from './errors'
export * from './repositories'
