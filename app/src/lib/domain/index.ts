/**
 * Canonical domain model (barrel export).
 *
 * Single source of truth: features/00-foundation-architecture.md §5. Every feature module
 * should import entity/shared types from here instead of redefining them (AC-00.1).
 */
export * from './shared'
export * from './exercise'
export * from './routine'
export * from './schedule'
export * from './session'
export * from './health-report'
export * from './meta'
