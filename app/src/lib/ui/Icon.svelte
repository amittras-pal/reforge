<script module lang="ts">
  export type IconName =
    | 'today'
    | 'calendar'
    | 'configure'
    | 'health'
    | 'settings'
    | 'close'
    | 'check'
    | 'chevron-down'
    | 'chevron-up'
    | 'chevron-left'
    | 'chevron-right'
    | 'plus'
    | 'minus'
    | 'trash'
    | 'copy'
    | 'play'
    | 'pause'
    | 'skip'
    | 'square'
    | 'square-check'
</script>

<script lang="ts">
  /**
   * Thin wrapper over `@tabler/icons-svelte` (MAINTENANCE: replaced the original hand-drawn
   * inline SVGs with a maintained icon package). The public props (`name`, `size`) are
   * unchanged from before, so no call site elsewhere in the app needed to change. Imported
   * from the package root (not a deep `/icons/*.svelte` subpath) — the subpath exports map
   * only declares `types`/`svelte` conditions with no `default` fallback, which `tsc`/
   * `svelte-check`'s Node-style resolution can't follow without extra `customConditions`
   * config; the root barrel re-exports every icon as a named `IconXxx` export and resolves
   * fine, and tree-shaking (the package declares `sideEffects: false`) still only bundles the
   * ones actually imported.
   */
  import {
    IconAdjustments,
    IconCalendar,
    IconCheck,
    IconChevronDown,
    IconChevronLeft,
    IconChevronRight,
    IconChevronUp,
    IconCircleCheck,
    IconCopy,
    IconHeart,
    IconMinus,
    IconPlayerPauseFilled,
    IconPlayerPlayFilled,
    IconPlayerSkipForward,
    IconPlus,
    IconSettings,
    IconSquareRounded,
    IconSquareRoundedCheckFilled,
    IconTrash,
    IconX,
  } from '@tabler/icons-svelte'

  // Chosen for closest visual match to the icons they replace (e.g. `play`/`pause` were
  // originally filled shapes, `skip` was an outline — kept that distinction here).
  const iconComponents: Record<IconName, typeof IconCircleCheck> = {
    today: IconCircleCheck,
    calendar: IconCalendar,
    configure: IconAdjustments,
    health: IconHeart,
    settings: IconSettings,
    close: IconX,
    check: IconCheck,
    'chevron-down': IconChevronDown,
    'chevron-up': IconChevronUp,
    'chevron-left': IconChevronLeft,
    'chevron-right': IconChevronRight,
    plus: IconPlus,
    minus: IconMinus,
    trash: IconTrash,
    copy: IconCopy,
    play: IconPlayerPlayFilled,
    pause: IconPlayerPauseFilled,
    skip: IconPlayerSkipForward,
    square: IconSquareRounded,
    'square-check': IconSquareRoundedCheckFilled,
  }

  let { name, size = 20 }: { name: IconName; size?: number } = $props()

  // Capitalized so Svelte 5 renders it as a dynamic component tag directly (no
  // `<svelte:component>` needed in runes mode).
  const SelectedIcon = $derived(iconComponents[name])
</script>

<SelectedIcon {size} aria-hidden="true" />
