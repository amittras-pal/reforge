<script lang="ts">
  import { push } from 'svelte-spa-router'
  import type { HealthReport } from '../../lib/domain'
  import { healthReportsRepo, liveQueryStore } from '../../lib/db'
  import { appBarAction, pageTitle } from '../../lib/stores/shell'
  import Card from '../../lib/ui/Card.svelte'
  import EmptyState from '../../lib/ui/EmptyState.svelte'
  import ListRow from '../../lib/ui/ListRow.svelte'
  import FieldDisplay from './FieldDisplay.svelte'
  import MetricTrendCard from './MetricTrendCard.svelte'
  import {
    formatControlValue,
    formatReportSummary,
    getTrendSeries,
    sortReportsByDateDesc,
    TREND_METRICS,
  } from './healthService'

  /** `/health` (FR-09.11, FR-09.13): all reports newest-first, latest-vs-targets, 4 trends. */
  $effect(() => {
    pageTitle.set('Health Reports')
    appBarAction.set({ label: 'New report', onClick: () => push('/health/new') })
    return () => appBarAction.set(null)
  })

  const reports = liveQueryStore(() => healthReportsRepo.list(), [] as HealthReport[])
  const sorted = $derived(sortReportsByDateDesc($reports))
  const latest = $derived(sorted[0])

  function formatDate(localDate: string): string {
    return new Date(`${localDate}T00:00:00`).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }
</script>

<div class="screen">
  {#if $reports.length === 0}
    <EmptyState
      title="No health reports yet"
      message="Add your first InBody report to start tracking your body composition over time."
      actionLabel="New report"
      onAction={() => push('/health/new')}
    />
  {:else}
    {#if latest}
      <Card>
        <h2>Latest report — {formatDate(latest.reportDate)}</h2>
        <div class="score-hero">
          <span class="score-value">{latest.score ?? '—'}</span>
          <span class="score-label">InBody Score</span>
        </div>
        <div class="highlight-grid">
          <FieldDisplay label="Total Weight" value={latest.composition.totalWeightKg} unit="kg" />
          <FieldDisplay label="Target Weight" value={latest.targets.targetWeightKg} unit="kg" />
          <FieldDisplay label="Weight Control" value={formatControlValue(latest.targets.weightControlKg)} />
          <FieldDisplay label="Fat Control" value={formatControlValue(latest.targets.fatControlKg)} />
          <FieldDisplay label="Muscle Control" value={formatControlValue(latest.targets.muscleControlKg)} />
        </div>
      </Card>
    {/if}

    <div class="trends">
      {#each TREND_METRICS as metric (metric.key)}
        {@const series = getTrendSeries($reports, metric)}
        <MetricTrendCard
          label={metric.label}
          unit={metric.unit}
          points={series.points}
          current={series.current}
          delta={series.delta}
        />
      {/each}
    </div>

    <div class="list">
      {#each sorted as report (report.id)}
        <ListRow
          title={formatDate(report.reportDate)}
          subtitle={formatReportSummary(report)}
          onclick={() => push(`/health/${report.id}`)}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
    padding: var(--sp-4);
  }
  h2 {
    margin: 0 0 var(--sp-3);
    font-size: var(--fs-lg);
    color: var(--text);
  }
  .highlight-grid {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
  }
  .score-hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sp-1);
    padding: var(--sp-3) 0 var(--sp-4);
    margin-bottom: var(--sp-3);
    border-bottom: 1px solid var(--bg);
  }
  .score-value {
    font-size: var(--fs-2xl);
    font-weight: 700;
    line-height: 1;
    color: var(--primary);
  }
  .score-label {
    font-size: var(--fs-sm);
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .trends {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--sp-3);
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
  }
</style>
