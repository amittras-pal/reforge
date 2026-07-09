<script lang="ts">
  import { push } from 'svelte-spa-router'
  import Tabs from '../../lib/ui/Tabs.svelte'

  /** Shared tab bar across the 3 Configurator screens (FR-06.18); navigates via the router so
   * the URL (and back/forward, deep-linking) reflects the active tab. */
  let { active }: { active: 'exercises' | 'routines' | 'schedule' } = $props()

  const tabs = [
    { label: 'Exercises', value: 'exercises' },
    { label: 'Routines', value: 'routines' },
    { label: 'Schedule', value: 'schedule' },
  ]

  function handleChange(value: string) {
    push(`/configure/${value}`)
  }
</script>

<Tabs {tabs} value={active} onchange={handleChange} />
