<script lang="ts">
  import { pop, push } from 'svelte-spa-router'
  import type { HealthReportInput } from '../../lib/db'
  import { healthReportsRepo } from '../../lib/db'
  import { appBarAction, pageTitle } from '../../lib/stores/shell'
  import { showToast } from '../../lib/stores/toast'
  import HealthReportForm from './HealthReportForm.svelte'

  /** `/health/new` (FR-09.8, FR-09.12): an always-empty form for a dedicated "New report" action. */
  let saving = $state(false)
  let isFirstReport = $state(false)

  $effect(() => {
    healthReportsRepo.list().then((reports) => {
      isFirstReport = reports.length === 0
    })
  })

  $effect(() => {
    pageTitle.set('New report')
    appBarAction.set(null)
    return () => appBarAction.set(null)
  })

  async function handleSave(input: HealthReportInput) {
    saving = true
    try {
      const created = await healthReportsRepo.create(input)
      showToast('Report saved', 'success')
      push(`/health/${created.id}`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't save the report.", 'error')
    } finally {
      saving = false
    }
  }

  function handleCancel() {
    pop()
  }
</script>

<div class="screen">
  <HealthReportForm
    initial={null}
    {isFirstReport}
    {saving}
    onSave={handleSave}
    onCancel={handleCancel}
  />
</div>

<style>
  .screen {
    padding: var(--sp-4);
  }
</style>
