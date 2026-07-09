import type { ExerciseCategory, ExerciseType } from '../../lib/domain'

/** Human labels for `ExerciseCategory` (F-00 §5.1), used by selects/filters (FR-06.1, FR-06.2). */
export const EXERCISE_CATEGORY_OPTIONS: { label: string; value: ExerciseCategory }[] = [
  { label: 'Lower body', value: 'lower' },
  { label: 'Upper body', value: 'upper' },
  { label: 'Core', value: 'core' },
  { label: 'Cardio', value: 'cardio' },
  { label: 'Pelvic floor (PFMT)', value: 'pfmt' },
  { label: 'Mobility', value: 'mobility' },
  { label: 'Class', value: 'class' },
  { label: 'Other', value: 'other' },
]

export const EXERCISE_CATEGORY_LABELS: Record<ExerciseCategory, string> =
  Object.fromEntries(
    EXERCISE_CATEGORY_OPTIONS.map((option) => [option.value, option.label]),
  ) as Record<ExerciseCategory, string>

/** Human labels for `ExerciseType` (F-00 §5.1), used by the type switch (FR-06.2). */
export const EXERCISE_TYPE_OPTIONS: { label: string; value: ExerciseType }[] = [
  { label: 'Sets / reps', value: 'sets_reps' },
  { label: 'Duration', value: 'duration' },
]
