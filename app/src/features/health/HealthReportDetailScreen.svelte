<script lang="ts">
  import { push } from 'svelte-spa-router'
  import type { HealthReport } from '../../lib/domain'
  import type { HealthReportInput } from '../../lib/db'
  import { healthReportsRepo, liveQueryStore } from '../../lib/db'
  import { appBarAction, pageTitle } from '../../lib/stores/shell'
  import { showToast } from '../../lib/stores/toast'
  import Button from '../../lib/ui/Button.svelte'
  import Card from '../../lib/ui/Card.svelte'
  import ConfirmDialog from '../../lib/ui/ConfirmDialog.svelte'
  import EmptyState from '../../lib/ui/EmptyState.svelte'
  import BodyMap from './BodyMap.svelte'
  import FieldDisplay from './FieldDisplay.svelte'
  import HealthReportForm from './HealthReportForm.svelte'
  import ProfileSummary from './ProfileSummary.svelte'
  import {
    INBODY_SCORE_GOOD_MIN,
    VISCERAL_FAT_NORMAL_MAX,
    WHR_NORMAL_MAX,
    WHR_NORMAL_MIN,
  } from './healthService'

  /**
   * `/health/:id` (FR-09.12): grouped read view with Edit (toggles the same shared form
   * in place, F-09 §6) and Delete actions.
   */
  let { params }: { params?: { id?: string } } = $props()
  const id = $derived(params?.id ?? '')

  // `undefined` (not `[]`) as the initial value distinguishes "the live query hasn't emitted
  // yet" from "genuinely no reports", so a freshly-created report doesn't flash a scary
  // "Report not found" message during the brief async gap before the first emission.
  const allReports = liveQueryStore<HealthReport[] | undefined>(
    () => healthReportsRepo.list(),
    undefined,
  )
  const loading = $derived($allReports === undefined)
  const report = $derived($allReports?.find((r) => r.id === id))

  let editing = $state(false)
  let saving = $state(false)
  let confirmDeleteOpen = $state(false)

  const formattedDate = $derived(
    report
      ? new Date(`${report.reportDate}T00:00:00`).toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : '',
  )

  $effect(() => {
    pageTitle.set(report ? formattedDate : 'Report Detail')
    appBarAction.set(null)
    return () => appBarAction.set(null)
  })

  async function handleSave(input: HealthReportInput) {
    if (!report) return
    saving = true
    try {
      await healthReportsRepo.update(report.id, input)
      showToast('Report updated', 'success')
      editing = false
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't save changes.", 'error')
    } finally {
      saving = false
    }
  }

  async function handleDelete() {
    if (!report) return
    try {
      await healthReportsRepo.remove(report.id)
      showToast('Report deleted', 'success')
      push('/health')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed.', 'error')
    }
  }
</script>

<div class="screen">
  {#if loading}
    <p class="hint">Loading…</p>
  {:else if !report}
    <EmptyState title="Report not found" message="It may have been deleted." />
  {:else if editing}
    <HealthReportForm
      initial={report}
      {saving}
      onSave={handleSave}
      onCancel={() => (editing = false)}
    />
  {:else}
    <Card>
      <ProfileSummary />
    </Card>

    <Card>
      <h2>Report</h2>
      <FieldDisplay label="InBody Score" value={report.score} />
      <p class="hint">Score above {INBODY_SCORE_GOOD_MIN} is considered excellent.</p>
    </Card>

    <Card>
      <h2>Composition (kg)</h2>
      <FieldDisplay label="Body Water" value={report.composition.bodyWaterKg} unit="kg" />
      <FieldDisplay label="Protein" value={report.composition.proteinKg} unit="kg" />
      <FieldDisplay label="Mineral" value={report.composition.mineralKg} unit="kg" />
      <FieldDisplay label="Body Fat Mass" value={report.composition.bodyFatMassKg} unit="kg" />
      <FieldDisplay label="Total Weight" value={report.composition.totalWeightKg} unit="kg" />
    </Card>

    <Card>
      <h2>Muscle-Fat Analysis</h2>
      <FieldDisplay
        label="Skeletal Muscle Mass"
        value={report.muscleFat.skeletalMuscleMassKg}
        unit="kg"
      />
      <FieldDisplay label="Body Fat Mass" value={report.muscleFat.bodyFatMassKg} unit="kg" />
    </Card>

    <Card>
      <h2>Obesity Analysis</h2>
      <FieldDisplay label="BMI" value={report.obesity.bmi} unit=" kg/m²" />
      <FieldDisplay label="PBF" value={report.obesity.pbf} unit="%" />
    </Card>

    <Card>
      <h2>Targets</h2>
      <FieldDisplay label="Target Weight" value={report.targets.targetWeightKg} unit="kg" />
      <FieldDisplay label="Weight Control" value={report.targets.weightControlKg} unit="kg" />
      <FieldDisplay label="Fat Control" value={report.targets.fatControlKg} unit="kg" />
      <FieldDisplay label="Muscle Control" value={report.targets.muscleControlKg} unit="kg" />
    </Card>

    <Card>
      <h2>Ratios & Visceral Fat</h2>
      <FieldDisplay label="Waist-Hip Ratio" value={report.whr} />
      <p class="hint">Normal range: {WHR_NORMAL_MIN}–{WHR_NORMAL_MAX}</p>
      <FieldDisplay label="Visceral Fat Level" value={report.visceralFatLevel} />
      <p class="hint">Normal: below {VISCERAL_FAT_NORMAL_MAX}</p>
    </Card>

    <Card>
      <BodyMap title="Segmental Lean (kg)" segmental={report.segmentalLean} />
    </Card>

    <Card>
      <BodyMap title="Segmental Fat (kg)" segmental={report.segmentalFat} />
    </Card>

    <Card>
      <h2>Research Parameters</h2>
      <FieldDisplay label="Fat Free Mass" value={report.research.fatFreeMassKg} unit="kg" />
      <FieldDisplay label="BMR" value={report.research.bmr} unit=" kcal" />
      <FieldDisplay label="Obesity Degree" value={report.research.obesityDegreePct} unit="%" />
      <FieldDisplay label="SMI" value={report.research.smi} unit=" kg/m²" />
      <FieldDisplay
        label="Recommended Calorie Intake"
        value={report.research.recommendedCalorieIntake}
        unit=" kcal"
      />
    </Card>

    {#if report.notes}
      <Card>
        <h2>Notes</h2>
        <p class="notes">{report.notes}</p>
      </Card>
    {/if}

    <div class="actions">
      <Button variant="secondary" onclick={() => (editing = true)}>Edit</Button>
      <Button variant="danger" onclick={() => (confirmDeleteOpen = true)}>Delete</Button>
    </div>
  {/if}
</div>

<ConfirmDialog
  bind:open={confirmDeleteOpen}
  title="Delete report?"
  message="This permanently removes this InBody report. This can't be undone."
  confirmLabel="Delete"
  variant="danger"
  onConfirm={handleDelete}
/>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
    padding: var(--sp-4);
  }
  h2 {
    margin: 0 0 var(--sp-2);
    font-size: var(--fs-lg);
    color: var(--text);
  }
  .hint {
    margin: var(--sp-1) 0 var(--sp-2);
    font-size: var(--fs-xs);
    color: var(--muted);
  }
  .notes {
    margin: 0;
    color: var(--text);
    white-space: pre-wrap;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--sp-2);
  }
</style>
