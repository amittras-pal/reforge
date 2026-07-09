<script lang="ts">
  import { untrack } from 'svelte'
  import type { HealthReport } from '../../lib/domain'
  import type { HealthReportInput } from '../../lib/db'
  import { profile } from '../../lib/stores/settings'
  import { todayLocalDate } from '../../lib/utils'
  import Button from '../../lib/ui/Button.svelte'
  import Card from '../../lib/ui/Card.svelte'
  import TextField from '../../lib/ui/TextField.svelte'
  import ProfileSummary from './ProfileSummary.svelte'
  import SegmentalFieldRow from './SegmentalFieldRow.svelte'
  import {
    calculateBmi,
    calculateFatFreeMass,
    calculatePbf,
    calculateTotalWeight,
    INBODY_SCORE_GOOD_MIN,
    isValidNonNegative,
    parseOptionalNumber,
    segmentalFormToInput,
    segmentalMassValues,
    segmentalToFormValue,
    VISCERAL_FAT_NORMAL_MAX,
    WHR_NORMAL_MAX,
    WHR_NORMAL_MIN,
  } from './healthService'

  /**
   * Shared grouped form for creating (FR-09.8) and in-place editing (FR-09.9) a health
   * report. Reused by `HealthReportFormScreen` (`/health/new`) and `HealthReportDetailScreen`
   * (`/health/:id`'s Edit mode) — "Edit opens the same grouped form" (F-09 §6).
   */
  let {
    initial,
    isFirstReport = false,
    saving = false,
    onSave,
    onCancel,
  }: {
    initial: HealthReport | null
    isFirstReport?: boolean
    saving?: boolean
    onSave: (input: HealthReportInput) => void
    onCancel: () => void
  } = $props()

  function numToStr(value: number | undefined): string {
    return value !== undefined ? String(value) : ''
  }

  // Local string mirrors of every field, seeded once from `initial` (never re-synced —
  // this component is freshly (re)mounted whenever it switches between create/edit
  // targets, same pattern as F-07's SetRow/DurationLogger actuals-input).
  let reportDate = $state(untrack(() => initial?.reportDate ?? todayLocalDate()))
  let score = $state(untrack(() => numToStr(initial?.score)))

  let composition = $state(
    untrack(() => ({
      bodyWaterKg: numToStr(initial?.composition.bodyWaterKg),
      proteinKg: numToStr(initial?.composition.proteinKg),
      mineralKg: numToStr(initial?.composition.mineralKg),
      bodyFatMassKg: numToStr(initial?.composition.bodyFatMassKg),
      totalWeightKg: numToStr(initial?.composition.totalWeightKg),
    })),
  )

  let muscleFat = $state(
    untrack(() => ({
      skeletalMuscleMassKg: numToStr(initial?.muscleFat.skeletalMuscleMassKg),
      bodyFatMassKg: numToStr(initial?.muscleFat.bodyFatMassKg),
    })),
  )

  let obesity = $state(
    untrack(() => ({
      bmi: numToStr(initial?.obesity.bmi),
      pbf: numToStr(initial?.obesity.pbf),
    })),
  )

  let targets = $state(
    untrack(() => ({
      targetWeightKg: numToStr(initial?.targets.targetWeightKg),
      weightControlKg: numToStr(initial?.targets.weightControlKg),
      fatControlKg: numToStr(initial?.targets.fatControlKg),
      muscleControlKg: numToStr(initial?.targets.muscleControlKg),
    })),
  )

  let whr = $state(untrack(() => numToStr(initial?.whr)))
  let visceralFatLevel = $state(untrack(() => numToStr(initial?.visceralFatLevel)))

  let segmentalLean = $state(untrack(() => segmentalToFormValue(initial?.segmentalLean)))
  let segmentalFat = $state(untrack(() => segmentalToFormValue(initial?.segmentalFat)))

  let research = $state(
    untrack(() => ({
      fatFreeMassKg: numToStr(initial?.research.fatFreeMassKg),
      bmr: numToStr(initial?.research.bmr),
      obesityDegreePct: numToStr(initial?.research.obesityDegreePct),
      smi: numToStr(initial?.research.smi),
      recommendedCalorieIntake: numToStr(initial?.research.recommendedCalorieIntake),
    })),
  )

  let notes = $state(untrack(() => initial?.notes ?? ''))

  let errorMessage = $state<string | null>(null)

  // Auto-fill-with-override suggestions (FR-09.7): computed live from height + composition,
  // shown as a "Use calculated" affordance next to the (still freely editable) field.
  const bmiSuggestion = $derived(
    calculateBmi($profile.heightCm, parseOptionalNumber(composition.totalWeightKg)),
  )
  const pbfSuggestion = $derived(
    calculatePbf(
      parseOptionalNumber(composition.bodyFatMassKg),
      parseOptionalNumber(composition.totalWeightKg),
    ),
  )
  const totalWeightSuggestion = $derived(
    calculateTotalWeight(
      parseOptionalNumber(composition.bodyWaterKg),
      parseOptionalNumber(composition.proteinKg),
      parseOptionalNumber(composition.mineralKg),
      parseOptionalNumber(composition.bodyFatMassKg),
    ),
  )
  // Muscle-Fat Analysis's Body Fat Mass is the same measurement as Composition's — no
  // calculation, just mirrored as a suggestion the user can accept or override.
  const muscleFatBodyFatMassSuggestion = $derived(
    parseOptionalNumber(composition.bodyFatMassKg),
  )
  const fatFreeMassSuggestion = $derived(
    calculateFatFreeMass(
      parseOptionalNumber(composition.bodyWaterKg),
      parseOptionalNumber(composition.proteinKg),
      parseOptionalNumber(composition.mineralKg),
    ),
  )

  function validate(): string | null {
    if (!reportDate) return 'Report date is required.'
    const nonNegativeValues = [
      score,
      composition.bodyWaterKg,
      composition.proteinKg,
      composition.mineralKg,
      composition.bodyFatMassKg,
      composition.totalWeightKg,
      muscleFat.skeletalMuscleMassKg,
      muscleFat.bodyFatMassKg,
      obesity.bmi,
      obesity.pbf,
      targets.targetWeightKg,
      whr,
      visceralFatLevel,
      research.fatFreeMassKg,
      research.bmr,
      research.obesityDegreePct,
      research.smi,
      research.recommendedCalorieIntake,
      ...segmentalMassValues(segmentalLean),
      ...segmentalMassValues(segmentalFat),
    ]
    if (nonNegativeValues.some((value) => !isValidNonNegative(value))) {
      return 'Measurements must be zero or greater (the target control fields may be negative).'
    }
    return null
  }

  function buildInput(): HealthReportInput {
    const input: HealthReportInput = {
      reportDate,
      score: parseOptionalNumber(score),
      composition: {
        bodyWaterKg: parseOptionalNumber(composition.bodyWaterKg),
        proteinKg: parseOptionalNumber(composition.proteinKg),
        mineralKg: parseOptionalNumber(composition.mineralKg),
        bodyFatMassKg: parseOptionalNumber(composition.bodyFatMassKg),
        totalWeightKg: parseOptionalNumber(composition.totalWeightKg),
      },
      muscleFat: {
        skeletalMuscleMassKg: parseOptionalNumber(muscleFat.skeletalMuscleMassKg),
        bodyFatMassKg: parseOptionalNumber(muscleFat.bodyFatMassKg),
      },
      obesity: {
        bmi: parseOptionalNumber(obesity.bmi),
        pbf: parseOptionalNumber(obesity.pbf),
      },
      targets: {
        targetWeightKg: parseOptionalNumber(targets.targetWeightKg),
        weightControlKg: parseOptionalNumber(targets.weightControlKg),
        fatControlKg: parseOptionalNumber(targets.fatControlKg),
        muscleControlKg: parseOptionalNumber(targets.muscleControlKg),
      },
      whr: parseOptionalNumber(whr),
      visceralFatLevel: parseOptionalNumber(visceralFatLevel),
      segmentalLean: segmentalFormToInput(segmentalLean),
      segmentalFat: segmentalFormToInput(segmentalFat),
      research: {
        fatFreeMassKg: parseOptionalNumber(research.fatFreeMassKg),
        bmr: parseOptionalNumber(research.bmr),
        obesityDegreePct: parseOptionalNumber(research.obesityDegreePct),
        smi: parseOptionalNumber(research.smi),
        recommendedCalorieIntake: parseOptionalNumber(research.recommendedCalorieIntake),
      },
      notes: notes.trim() || undefined,
    }
    // Defensive snapshot — these are plain values parsed out of $state strings, but every
    // nested-$state-object save bug in this codebase started as "surely this one's plain".
    return $state.snapshot(input)
  }

  function handleSubmit() {
    const validationError = validate()
    if (validationError) {
      errorMessage = validationError
      return
    }
    errorMessage = null
    onSave(buildInput())
  }
</script>

<div class="form">
  <Card>
    <ProfileSummary />
  </Card>

  {#if isFirstReport}
    <p class="first-report-hint">
      This is your first report — profile fields you haven't set yet will show as missing
      above, but you can still save. Fill them in from Settings whenever you like.
    </p>
  {/if}

  <Card>
    <h2>Report</h2>
    <div class="field-stack">
      <TextField label="Report Date" type="date" bind:value={reportDate} />
      <TextField label={`InBody Score (>${INBODY_SCORE_GOOD_MIN} is excellent)`} type="number" bind:value={score} />
    </div>
  </Card>

  <Card>
    <h2>Composition (kg)</h2>
    <div class="field-stack">
      <TextField label="Body Water (kg)" type="number" bind:value={composition.bodyWaterKg} />
      <TextField label="Protein (kg)" type="number" bind:value={composition.proteinKg} />
      <TextField label="Mineral (kg)" type="number" bind:value={composition.mineralKg} />
      <TextField label="Body Fat Mass (kg)" type="number" bind:value={composition.bodyFatMassKg} />
      <div class="field-with-suggestion">
        <TextField label="Total Weight (kg)" type="number" bind:value={composition.totalWeightKg} />
        {#if totalWeightSuggestion !== undefined && parseOptionalNumber(composition.totalWeightKg) !== totalWeightSuggestion}
          <button
            type="button"
            class="suggestion-btn"
            onclick={() => (composition.totalWeightKg = String(totalWeightSuggestion))}
          >
            Use calculated: {totalWeightSuggestion} kg
          </button>
        {/if}
      </div>
    </div>
  </Card>

  <Card>
    <h2>Muscle-Fat Analysis</h2>
    <div class="field-stack">
      <TextField
        label="Skeletal Muscle Mass (kg)"
        type="number"
        bind:value={muscleFat.skeletalMuscleMassKg}
      />
      <div class="field-with-suggestion">
        <TextField label="Body Fat Mass (kg)" type="number" bind:value={muscleFat.bodyFatMassKg} />
        {#if muscleFatBodyFatMassSuggestion !== undefined && parseOptionalNumber(muscleFat.bodyFatMassKg) !== muscleFatBodyFatMassSuggestion}
          <button
            type="button"
            class="suggestion-btn"
            onclick={() => (muscleFat.bodyFatMassKg = String(muscleFatBodyFatMassSuggestion))}
          >
            Use calculated: {muscleFatBodyFatMassSuggestion} kg
          </button>
        {/if}
      </div>
    </div>
  </Card>

  <Card>
    <h2>Obesity Analysis</h2>
    <div class="field-stack">
      <div class="field-with-suggestion">
        <TextField label="BMI (kg/m²)" type="number" bind:value={obesity.bmi} />
        {#if bmiSuggestion !== undefined && parseOptionalNumber(obesity.bmi) !== bmiSuggestion}
          <button
            type="button"
            class="suggestion-btn"
            onclick={() => (obesity.bmi = String(bmiSuggestion))}
          >
            Use calculated: {bmiSuggestion} kg/m²
          </button>
        {/if}
      </div>
      <div class="field-with-suggestion">
        <TextField label="PBF (%)" type="number" bind:value={obesity.pbf} />
        {#if pbfSuggestion !== undefined && parseOptionalNumber(obesity.pbf) !== pbfSuggestion}
          <button
            type="button"
            class="suggestion-btn"
            onclick={() => (obesity.pbf = String(pbfSuggestion))}
          >
            Use calculated: {pbfSuggestion}%
          </button>
        {/if}
      </div>
    </div>
  </Card>

  <Card>
    <h2>Targets</h2>
    <div class="field-stack">
      <TextField label="Target Weight (kg)" type="number" bind:value={targets.targetWeightKg} />
      <TextField
        label="Weight Control (kg, may be negative)"
        type="number"
        bind:value={targets.weightControlKg}
      />
      <TextField
        label="Fat Control (kg, may be negative)"
        type="number"
        bind:value={targets.fatControlKg}
      />
      <TextField
        label="Muscle Control (kg, may be negative)"
        type="number"
        bind:value={targets.muscleControlKg}
      />
    </div>
  </Card>

  <Card>
    <h2>Ratios & Visceral Fat</h2>
    <div class="field-stack">
      <TextField
        label={`Waist-Hip Ratio (normal ${WHR_NORMAL_MIN}\u2013${WHR_NORMAL_MAX})`}
        type="number"
        bind:value={whr}
      />
      <TextField
        label={`Visceral Fat Level (normal < ${VISCERAL_FAT_NORMAL_MAX})`}
        type="number"
        bind:value={visceralFatLevel}
      />
    </div>
  </Card>

  <Card>
    <h2>Segmental Lean (kg)</h2>
    <div class="segmental-stack">
      <SegmentalFieldRow
        label="Left Arm"
        bind:mass={segmentalLean.leftArm.mass}
        bind:rating={segmentalLean.leftArm.rating}
      />
      <SegmentalFieldRow
        label="Right Arm"
        bind:mass={segmentalLean.rightArm.mass}
        bind:rating={segmentalLean.rightArm.rating}
      />
      <SegmentalFieldRow
        label="Torso"
        bind:mass={segmentalLean.torso.mass}
        bind:rating={segmentalLean.torso.rating}
      />
      <SegmentalFieldRow
        label="Left Leg"
        bind:mass={segmentalLean.leftLeg.mass}
        bind:rating={segmentalLean.leftLeg.rating}
      />
      <SegmentalFieldRow
        label="Right Leg"
        bind:mass={segmentalLean.rightLeg.mass}
        bind:rating={segmentalLean.rightLeg.rating}
      />
    </div>
  </Card>

  <Card>
    <h2>Segmental Fat (kg)</h2>
    <div class="segmental-stack">
      <SegmentalFieldRow
        label="Left Arm"
        bind:mass={segmentalFat.leftArm.mass}
        bind:rating={segmentalFat.leftArm.rating}
      />
      <SegmentalFieldRow
        label="Right Arm"
        bind:mass={segmentalFat.rightArm.mass}
        bind:rating={segmentalFat.rightArm.rating}
      />
      <SegmentalFieldRow
        label="Torso"
        bind:mass={segmentalFat.torso.mass}
        bind:rating={segmentalFat.torso.rating}
      />
      <SegmentalFieldRow
        label="Left Leg"
        bind:mass={segmentalFat.leftLeg.mass}
        bind:rating={segmentalFat.leftLeg.rating}
      />
      <SegmentalFieldRow
        label="Right Leg"
        bind:mass={segmentalFat.rightLeg.mass}
        bind:rating={segmentalFat.rightLeg.rating}
      />
    </div>
  </Card>

  <Card>
    <h2>Research Parameters</h2>
    <div class="field-stack">
      <div class="field-with-suggestion">
        <TextField label="Fat Free Mass (kg)" type="number" bind:value={research.fatFreeMassKg} />
        {#if fatFreeMassSuggestion !== undefined && parseOptionalNumber(research.fatFreeMassKg) !== fatFreeMassSuggestion}
          <button
            type="button"
            class="suggestion-btn"
            onclick={() => (research.fatFreeMassKg = String(fatFreeMassSuggestion))}
          >
            Use calculated: {fatFreeMassSuggestion} kg
          </button>
        {/if}
      </div>
      <TextField label="BMR (kcal)" type="number" bind:value={research.bmr} />
      <TextField label="Obesity Degree (%)" type="number" bind:value={research.obesityDegreePct} />
      <TextField label="SMI (kg/m²)" type="number" bind:value={research.smi} />
      <TextField
        label="Recommended Calorie Intake (kcal)"
        type="number"
        bind:value={research.recommendedCalorieIntake}
      />
    </div>
  </Card>

  <Card>
    <h2>Notes</h2>
    <TextField label="Notes (optional)" bind:value={notes} />
  </Card>

  {#if errorMessage}
    <p class="error-text">{errorMessage}</p>
  {/if}

  <div class="actions">
    <Button variant="secondary" onclick={onCancel}>Cancel</Button>
    <Button onclick={handleSubmit} disabled={saving}>
      {saving ? 'Saving…' : 'Save report'}
    </Button>
  </div>
</div>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
  }
  h2 {
    margin: 0 0 var(--sp-3);
    font-size: var(--fs-lg);
    color: var(--text);
  }
  .field-stack {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }
  .segmental-stack {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }
  .first-report-hint {
    margin: 0;
    padding: var(--sp-3);
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--primary) 10%, var(--surface));
    color: var(--text);
    font-size: var(--fs-sm);
  }
  .field-with-suggestion {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
  }
  .suggestion-btn {
    align-self: flex-start;
    border: none;
    background: transparent;
    color: var(--primary);
    font-family: inherit;
    font-size: var(--fs-xs);
    font-weight: 600;
    cursor: pointer;
    padding: 0;
  }
  .error-text {
    margin: 0;
    color: var(--danger);
    font-size: var(--fs-sm);
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--sp-2);
  }
</style>
