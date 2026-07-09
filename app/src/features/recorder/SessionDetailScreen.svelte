<script lang="ts">
  import { liveQueryStore, sessionLogsRepo } from '../../lib/db'
  import { appBarAction, pageTitle } from '../../lib/stores/shell'
  import { push } from 'svelte-spa-router'
  import Button from '../../lib/ui/Button.svelte'
  import EmptyState from '../../lib/ui/EmptyState.svelte'
  import { isLoggableDate } from './recorderService'
  import SessionDetailCard from './SessionDetailCard.svelte'

  /** `/calendar/:date` (FR-08.6, FR-08.8–11): the selected day's session(s), full detail. */
  let { params }: { params?: { date?: string } } = $props()

  const date = $derived(params?.date ?? '')
  const isValidDate = $derived(/^\d{4}-\d{2}-\d{2}$/.test(date))

  const allSessions = liveQueryStore(() => sessionLogsRepo.list(), [])
  const daySessions = $derived($allSessions.filter((s) => s.date === date))
  const loggable = $derived(isValidDate && isLoggableDate(date))

  const formattedDate = $derived(
    isValidDate
      ? new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : '',
  )

  $effect(() => {
    pageTitle.set(isValidDate ? formattedDate : 'Session Detail')
    appBarAction.set(null)
    return () => appBarAction.set(null)
  })

  function goToToday() {
    push('/today')
  }
</script>

<div class="screen">
  {#if !isValidDate}
    <EmptyState title="Unknown date" message="This link doesn't point at a valid date." />
  {:else}
    {#if loggable}
      <Button variant="secondary" onclick={goToToday}>Log session</Button>
    {/if}

    {#if daySessions.length === 0}
      <EmptyState
        title="No sessions"
        message={loggable
          ? 'Nothing logged for this day yet.'
          : "No session was recorded for this day."}
      />
    {:else}
      <div class="sessions">
        {#each daySessions as session (session.id)}
          <SessionDetailCard {session} />
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
    padding: var(--sp-4);
  }
  .sessions {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }
</style>
