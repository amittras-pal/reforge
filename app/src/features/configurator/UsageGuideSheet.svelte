<script lang="ts">
  import BottomSheet from '../../lib/ui/BottomSheet.svelte'

  /** Static usage guidance (FR-06.20), linked from the Configurator empty-state and Settings. */
  let { open = $bindable(false) }: { open?: boolean } = $props()
</script>

<BottomSheet bind:open title="How to structure a training day">
  <div class="guide">
    <p>
      A routine is just an <strong>ordered list</strong> of exercises — there's no separate
      warm-up/cool-down section to fill in. Instead:
    </p>
    <ol>
      <li>
        <strong>Warm-up</strong> — add it as the first item(s): a short <em>duration</em> exercise
        like "Treadmill Warm-up" (5 min), or a light <em>sets/reps</em> exercise like "Band
        Pull-apart" (2×15). Categorize them as Cardio/Mobility so they stand out visually.
      </li>
      <li>
        <strong>Main work</strong> — your ordered lifts or cardio. Give two items the same
        "superset group" label (e.g. "arms") to mark them as a superset.
      </li>
      <li>
        <strong>Cool-down</strong> — add as the last item(s): an easy duration exercise or a
        mobility stretch.
      </li>
    </ol>
    <p>
      Order, category, the optional superset label, and per-item notes are enough to express a
      full session — no formal "sections" construct needed.
    </p>
  </div>
</BottomSheet>

<style>
  .guide {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    color: var(--text);
    font-size: var(--fs-md);
  }
  .guide ol {
    margin: 0;
    padding-left: var(--sp-5);
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }
</style>
