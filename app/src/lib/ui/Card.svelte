<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children }: { children?: Snippet } = $props()
</script>

<div class="card">
  {@render children?.()}
</div>

<style>
  .card {
    background: var(--surface);
    border-radius: var(--radius-md);
    padding: var(--sp-4);
  }
</style>
