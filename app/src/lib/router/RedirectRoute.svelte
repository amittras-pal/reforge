<script lang="ts">
  import { replace } from 'svelte-spa-router'

  let { to }: { to: string } = $props()

  $effect(() => {
    replace(to)
  })
</script>
