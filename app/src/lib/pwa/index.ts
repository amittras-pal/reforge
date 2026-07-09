/**
 * Public surface of the offline/PWA layer (F-04).
 */
export {
  needRefresh,
  offlineReady,
  offlineReadyPulse,
  updateServiceWorker,
} from './register'
export { createAutoDismissPulse } from './pulse'
export {
  requestPersistentStorage,
  isStoragePersisted,
  getStorageUsage,
  watchForFirstMeaningfulWrite,
  type StorageUsage,
} from './storage'
export {
  installPromptAvailable,
  appInstalled,
  promptInstall,
  isIOS,
  isStandalone,
} from './install'
