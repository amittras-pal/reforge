<script lang="ts">
  import { liveQueryStore, sessionLogsRepo } from '../../lib/db'
  import { appBarAction, pageTitle } from '../../lib/stores/shell'
  import { weekStartsOn } from '../../lib/stores/settings'
  import { push } from 'svelte-spa-router'
  import { SvelteMap } from 'svelte/reactivity'
  import { todayLocalDate, WEEKDAY_LABELS } from '../../lib/utils'
  import IconButton from '../../lib/ui/IconButton.svelte'
  import {
    currentMonthRange,
    currentWeekRange,
    getMonthGrid,
  } from './recorderService'

  /** `/calendar` (FR-08.4–FR-08.7): month grid with session indicators + week/month counts. */
  $effect(() => {
    pageTitle.set('Calendar')
    appBarAction.set(null)
    return () => appBarAction.set(null)
  })

  const today = todayLocalDate()
  const [todayYear, todayMonth] = today.split('-').map(Number) as [number, number]
  let viewYear = $state(todayYear)
  let viewMonth = $state(todayMonth)

  const allSessions = liveQueryStore(() => sessionLogsRepo.list(), [])

  const grid = $derived(getMonthGrid(viewYear, viewMonth, $weekStartsOn))
  const orderedLabels = $derived(
    Array.from({ length: 7 }, (_, i) => WEEKDAY_LABELS[(i + $weekStartsOn) % 7] ?? ''),
  )

  const sessionsByDate = $derived.by(() => {
    const map = new SvelteMap<string, { completed: number; partial: number }>()
    for (const log of $allSessions) {
      const entry = map.get(log.date) ?? { completed: 0, partial: 0 }
      if (log.status === 'completed') entry.completed += 1
      else entry.partial += 1
      map.set(log.date, entry)
    }
    return map
  })

  const weekCount = $derived.by(() => {
    const range = currentWeekRange($weekStartsOn)
    return $allSessions.filter((s) => s.date >= range.from && s.date <= range.to).length
  })
  const monthCount = $derived.by(() => {
    const range = currentMonthRange(today)
    return $allSessions.filter((s) => s.date >= range.from && s.date <= range.to).length
  })

  const monthLabel = $derived(
    new Date(viewYear, viewMonth - 1, 1).toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    }),
  )

  function prevMonth() {
    if (viewMonth === 1) {
      viewMonth = 12
      viewYear -= 1
    } else {
      viewMonth -= 1
    }
  }

  function nextMonth() {
    if (viewMonth === 12) {
      viewMonth = 1
      viewYear += 1
    } else {
      viewMonth += 1
    }
  }

  function jumpToToday() {
    viewYear = todayYear
    viewMonth = todayMonth
  }

  function selectDate(date: string) {
    push(`/calendar/${date}`)
  }
</script>

<div class="screen">
  <div class="stats">
    <div class="stat-chip">
      <span class="stat-value">{weekCount}</span>
      <span class="stat-label">This week</span>
    </div>
    <div class="stat-chip">
      <span class="stat-value">{monthCount}</span>
      <span class="stat-label">This month</span>
    </div>
  </div>

  <div class="nav">
    <IconButton icon="chevron-left" label="Previous month" onclick={prevMonth} />
    <div class="nav-center">
      <span class="month-label">{monthLabel}</span>
      <button type="button" class="today-link" onclick={jumpToToday}>Today</button>
    </div>
    <IconButton icon="chevron-right" label="Next month" onclick={nextMonth} />
  </div>

  <div class="weekday-header">
    {#each orderedLabels as label (label)}
      <span class="weekday-label">{label.slice(0, 3)}</span>
    {/each}
  </div>

  <div class="grid">
    {#each grid as cell (cell.date)}
      {@const counts = sessionsByDate.get(cell.date)}
      <button
        type="button"
        class="cell"
        class:dimmed={!cell.inCurrentMonth}
        class:today={cell.isToday}
        disabled={!cell.inCurrentMonth}
        onclick={() => selectDate(cell.date)}
      >
        <span class="day-number">{Number(cell.date.slice(8, 10))}</span>
        {#if counts}
          <span class="indicators">
            {#if counts.completed > 0}<span class="dot dot-completed"></span>{/if}
            {#if counts.partial > 0}<span class="dot dot-partial"></span>{/if}
          </span>
        {/if}
      </button>
    {/each}
  </div>
</div>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
    padding: var(--sp-4);
  }
  .stats {
    display: flex;
    gap: var(--sp-3);
  }
  .stat-chip {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sp-1);
    padding: var(--sp-3);
    border-radius: var(--radius-md);
    background: var(--surface);
  }
  .stat-value {
    font-size: var(--fs-xl);
    font-weight: 700;
    color: var(--primary);
  }
  .stat-label {
    font-size: var(--fs-xs);
    color: var(--muted);
  }
  .nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .nav-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sp-1);
  }
  .month-label {
    font-size: var(--fs-lg);
    font-weight: 600;
    color: var(--text);
  }
  .today-link {
    border: none;
    background: transparent;
    color: var(--primary);
    font-family: inherit;
    font-size: var(--fs-xs);
    font-weight: 600;
    cursor: pointer;
    padding: 0;
  }
  .weekday-header {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    text-align: center;
  }
  .weekday-label {
    font-size: var(--fs-xs);
    color: var(--muted);
    font-weight: 600;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: var(--sp-1);
  }
  .cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--sp-1);
    aspect-ratio: 1;
    border: none;
    border-radius: var(--radius-md);
    background: var(--surface);
    color: var(--text);
    font-family: inherit;
    font-size: var(--fs-sm);
    cursor: pointer;
  }
  .cell.dimmed {
    color: var(--muted);
    opacity: 0.5;
  }
  .cell:disabled {
    cursor: default;
  }
  .cell.today {
    outline: 2px solid var(--primary);
    outline-offset: -2px;
    font-weight: 700;
  }
  .indicators {
    display: flex;
    gap: 3px;
  }
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  .dot-completed {
    background: var(--success);
  }
  .dot-partial {
    background: var(--warning);
  }
</style>
