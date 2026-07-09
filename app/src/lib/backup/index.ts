/**
 * Public surface of the backup export/import layer (F-05).
 */
export {
  APP_ID,
  STORE_KEYS,
  type BackupData,
  type BackupEnvelope,
  type BackupIntegrity,
  type StoreKey,
} from './envelope'
export { canonicalJson } from './canonical'
export {
  computeHash,
  checkHash,
  computeHmac,
  checkHmac,
  type HashStatus,
  type IntegrityPayload,
} from './integrity'
export { migrateBackupData } from './migrate'
export {
  parseEnvelope,
  validateBackupData,
  type EnvelopeError,
  type ValidationIssue,
} from './validate'
export { buildBackupEnvelope, exportBackup } from './export'
export {
  MAX_BACKUP_FILE_BYTES,
  prepareImport,
  verifyImportSignature,
  applyImport,
  describeImportError,
  type ImportError,
  type PreparedImport,
  type PrepareImportResult,
  type ImportSummary,
} from './import'
export { shouldShowBackupReminder } from './reminder'
