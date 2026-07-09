import type { Exercise, Weekday } from '../../lib/domain'
import {
  exercisesRepo,
  routinesRepo,
  scheduleRepo,
  type ExerciseInput,
  type RoutineInput,
} from '../../lib/db'
import { createId } from '../../lib/utils'

/**
 * Opt-in starter program derived from research.md's 6-day Upper/Lower + Zone 2/core + PFMT
 * microcycle (FR-06.19). Never loaded automatically — only via an explicit user action in the
 * empty-state or Settings.
 */
const EXAMPLE_EXERCISES: ExerciseInput[] = [
  {
    name: 'Barbell Back Squat',
    category: 'lower',
    type: 'sets_reps',
    defaultPrescription: { kind: 'sets_reps', sets: 3, repsMin: 8, repsMax: 10, restSec: 105 },
    instructions: 'Or Hack Squat machine. Primary quad/glute stimulus.',
  },
  {
    name: 'Romanian Deadlift',
    category: 'lower',
    type: 'sets_reps',
    defaultPrescription: { kind: 'sets_reps', sets: 3, repsMin: 10, repsMax: 12, restSec: 90 },
    instructions: 'Or machine Leg Curl. Hamstring / posterior-chain developer.',
  },
  {
    name: 'Barbell Hip Thrust',
    category: 'lower',
    type: 'sets_reps',
    defaultPrescription: { kind: 'sets_reps', sets: 3, repsMin: 10, repsMax: 12, restSec: 90 },
    instructions: 'Pelvic stability + glute hypertrophy; promotes pelvic blood flow.',
  },
  {
    name: 'Leg Extension',
    category: 'lower',
    type: 'sets_reps',
    defaultPrescription: { kind: 'sets_reps', sets: 3, repsMin: 12, repsMax: 15, restSec: 60 },
  },
  {
    name: 'Standing Calf Raise',
    category: 'lower',
    type: 'sets_reps',
    defaultPrescription: { kind: 'sets_reps', sets: 3, repsMin: 15, repsMax: 20, restSec: 60 },
  },
  {
    name: 'Dumbbell Bench Press',
    category: 'upper',
    type: 'sets_reps',
    defaultPrescription: { kind: 'sets_reps', sets: 3, repsMin: 8, repsMax: 10, restSec: 105 },
    instructions: 'Or Machine Chest Press.',
  },
  {
    name: 'Wide Grip Lat Pulldown',
    category: 'upper',
    type: 'sets_reps',
    defaultPrescription: { kind: 'sets_reps', sets: 3, repsMin: 8, repsMax: 12, restSec: 90 },
  },
  {
    name: 'Seated Cable Row',
    category: 'upper',
    type: 'sets_reps',
    defaultPrescription: { kind: 'sets_reps', sets: 3, repsMin: 10, repsMax: 12, restSec: 90 },
    instructions: 'Scapular retraction — rhomboids / mid-traps, postural integrity.',
  },
  {
    name: 'Dumbbell Overhead Press',
    category: 'upper',
    type: 'sets_reps',
    defaultPrescription: { kind: 'sets_reps', sets: 3, repsMin: 8, repsMax: 10, restSec: 90 },
  },
  {
    name: 'Dumbbell Lateral Raise',
    category: 'upper',
    type: 'sets_reps',
    defaultPrescription: { kind: 'sets_reps', sets: 3, repsMin: 12, repsMax: 15, restSec: 60 },
  },
  {
    name: 'Bicep Curl',
    category: 'upper',
    type: 'sets_reps',
    defaultPrescription: { kind: 'sets_reps', sets: 3, repsMin: 12, restSec: 45 },
    instructions: 'Superset with Triceps Cable Pushdown.',
  },
  {
    name: 'Triceps Cable Pushdown',
    category: 'upper',
    type: 'sets_reps',
    defaultPrescription: { kind: 'sets_reps', sets: 3, repsMin: 12, restSec: 45 },
    instructions: 'Superset with Bicep Curl.',
  },
  {
    name: 'Zone 2 Cardio',
    category: 'cardio',
    type: 'duration',
    defaultPrescription: {
      kind: 'duration',
      durationSec: 42 * 60,
      intensity: 'Zone 2',
      targetHrPctMin: 60,
      targetHrPctMax: 70,
    },
    instructions: 'Treadmill incline walk, elliptical, or stationary bike.',
  },
  {
    name: 'Plank',
    category: 'core',
    type: 'duration',
    defaultPrescription: { kind: 'duration', durationSec: 50 },
    instructions: 'Hold; repeat for 3 sets.',
  },
  {
    name: 'Deadbug',
    category: 'core',
    type: 'sets_reps',
    defaultPrescription: { kind: 'sets_reps', sets: 3, repsMin: 12 },
    instructions: 'Reps per side.',
  },
  {
    name: 'Cable Woodchopper',
    category: 'core',
    type: 'sets_reps',
    defaultPrescription: { kind: 'sets_reps', sets: 3, repsMin: 12 },
    instructions: 'Reps per side.',
  },
  {
    name: 'Group Class (HRX / Boxing / Yoga)',
    category: 'class',
    type: 'duration',
    defaultPrescription: { kind: 'duration', durationSec: 55 * 60 },
    instructions: 'Cult-style group class — pick based on energy/recovery that week.',
  },
  {
    name: 'Pelvic Floor Training (PFMT)',
    category: 'pfmt',
    type: 'sets_reps',
    defaultPrescription: { kind: 'sets_reps', sets: 3, repsMin: 10, repsMax: 15, restSec: 5 },
    instructions:
      '3–5s holds x10–15 reps, then 10 quick "flicks". Isolate the pelvic floor only.',
  },
]

/** `[exerciseName, supersetGroup?]` pairs, in order, for one routine's items. */
type ItemSpec = [name: string, supersetGroup?: string]

function itemsFor(byName: Map<string, Exercise>, specs: ItemSpec[]) {
  return specs.map(([name, supersetGroup], order) => {
    const exercise = byName.get(name)
    if (!exercise) {
      throw new Error(`Example program: missing exercise "${name}"`)
    }
    return {
      itemId: createId(),
      exerciseId: exercise.id,
      order,
      prescription: exercise.defaultPrescription,
      supersetGroup,
    }
  })
}

/**
 * Inserts the starter exercises/routines/schedule (FR-06.19). Purely additive — never called
 * automatically; the caller (empty-state action or Settings) is responsible for confirming
 * with the user first.
 */
export async function loadExampleProgram(): Promise<void> {
  const byName = new Map<string, Exercise>()
  for (const input of EXAMPLE_EXERCISES) {
    byName.set(input.name, await exercisesRepo.create(input))
  }

  async function createRoutine(input: RoutineInput) {
    return routinesRepo.create(input)
  }

  const lowerBody = await createRoutine({
    name: 'Lower Body A',
    focus: 'Lower Body Hypertrophy & Pelvic Stability',
    items: itemsFor(byName, [
      ['Barbell Back Squat'],
      ['Romanian Deadlift'],
      ['Barbell Hip Thrust'],
      ['Leg Extension'],
      ['Standing Calf Raise'],
      ['Pelvic Floor Training (PFMT)'],
    ]),
  })

  const upperBody = await createRoutine({
    name: 'Upper Body A',
    focus: 'Upper Body Hypertrophy & Postural Integrity',
    items: itemsFor(byName, [
      ['Dumbbell Bench Press'],
      ['Wide Grip Lat Pulldown'],
      ['Seated Cable Row'],
      ['Dumbbell Overhead Press'],
      ['Dumbbell Lateral Raise'],
      ['Bicep Curl', 'arms'],
      ['Triceps Cable Pushdown', 'arms'],
      ['Pelvic Floor Training (PFMT)'],
    ]),
  })

  const zone2Core = await createRoutine({
    name: 'Zone 2 + Core',
    focus: 'Stamina, Core Stability & Stress Reduction',
    items: itemsFor(byName, [
      ['Zone 2 Cardio'],
      ['Plank'],
      ['Deadbug'],
      ['Cable Woodchopper'],
      ['Pelvic Floor Training (PFMT)'],
    ]),
  })

  const groupClass = await createRoutine({
    name: 'Group Class',
    focus: 'Dynamic Stamina, Agility & Autonomic Balance',
    items: itemsFor(byName, [['Group Class (HRX / Boxing / Yoga)']]),
  })

  const assignments: [Weekday, string][] = [
    [1, lowerBody.id], // Monday
    [2, upperBody.id], // Tuesday
    [3, zone2Core.id], // Wednesday
    [4, lowerBody.id], // Thursday
    [5, upperBody.id], // Friday
    [6, groupClass.id], // Saturday
    // Sunday (0) stays a rest day, matching the research's "complete recovery".
  ]
  for (const [weekday, routineId] of assignments) {
    await scheduleRepo.setDay(weekday, [routineId])
  }
}
