import type { RouteDefinition } from 'svelte-spa-router'
import { wrap } from 'svelte-spa-router/wrap'
import ChecklistScreen from '../../features/checklist/ChecklistScreen.svelte'
import TodayScreen from '../../features/checklist/TodayScreen.svelte'
import ExercisesScreen from '../../features/configurator/ExercisesScreen.svelte'
import RoutineEditorScreen from '../../features/configurator/RoutineEditorScreen.svelte'
import RoutinesScreen from '../../features/configurator/RoutinesScreen.svelte'
import ScheduleScreen from '../../features/configurator/ScheduleScreen.svelte'
import CalendarScreen from '../../features/recorder/CalendarScreen.svelte'
import SessionDetailScreen from '../../features/recorder/SessionDetailScreen.svelte'
import SettingsScreen from '../../features/settings/SettingsScreen.svelte'
import HealthListScreen from '../../features/health/HealthListScreen.svelte'
import HealthReportDetailScreen from '../../features/health/HealthReportDetailScreen.svelte'
import HealthReportFormScreen from '../../features/health/HealthReportFormScreen.svelte'
import RedirectRoute from './RedirectRoute.svelte'

/**
 * Route table (FR-02.1). `/settings` is F-02/F-05's own screen; `/configure/*` is F-06's;
 * `/today` and `/checklist/:weekday` are F-07's; `/calendar*` is F-08's; `/health*` is F-09's.
 */
export const routes: RouteDefinition = {
  '/': wrap({ component: RedirectRoute, props: { to: '/today' } }),

  '/today': TodayScreen,
  '/checklist/:weekday': ChecklistScreen,

  '/calendar': CalendarScreen,
  '/calendar/:date': SessionDetailScreen,

  '/configure': wrap({ component: RedirectRoute, props: { to: '/configure/routines' } }),
  '/configure/exercises': ExercisesScreen,
  '/configure/routines': RoutinesScreen,
  '/configure/routines/new': RoutineEditorScreen,
  '/configure/routines/:id': RoutineEditorScreen,
  '/configure/schedule': ScheduleScreen,

  '/health': HealthListScreen,
  '/health/new': HealthReportFormScreen,
  '/health/:id': HealthReportDetailScreen,

  '/settings': SettingsScreen,

  // Catch-all must be last (FR-02.2).
  '*': wrap({ component: RedirectRoute, props: { to: '/today' } }),
}
