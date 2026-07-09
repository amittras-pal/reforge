<script lang="ts">
  import { link, router } from 'svelte-spa-router'
  import Icon, { type IconName } from './Icon.svelte'

  interface NavItem {
    label: string
    path: string
    icon: IconName
  }

  const items: NavItem[] = [
    { label: 'Today', path: '/today', icon: 'today' },
    { label: 'Calendar', path: '/calendar', icon: 'calendar' },
    { label: 'Configure', path: '/configure', icon: 'configure' },
    { label: 'Health', path: '/health', icon: 'health' },
    { label: 'Settings', path: '/settings', icon: 'settings' },
  ]

  function isActive(path: string): boolean {
    const current = router.location ?? ''
    return current === path || current.startsWith(`${path}/`)
  }
</script>

<nav class="nav-bar" aria-label="Primary">
  {#each items as item (item.path)}
    <a
      href={item.path}
      use:link
      class="nav-item"
      class:active={isActive(item.path)}
      aria-current={isActive(item.path) ? 'page' : undefined}
    >
      <Icon name={item.icon} />
      <span class="nav-label">{item.label}</span>
    </a>
  {/each}
</nav>

<style>
  .nav-bar {
    display: flex;
    background: var(--bg);
    border-top: 1px solid var(--surface);
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
  }
  .nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-height: var(--touch-target-min);
    padding: var(--sp-2) 0;
    padding-bottom: calc(var(--sp-2) + env(safe-area-inset-bottom, 0px));
    color: var(--muted);
    text-decoration: none;
    font-size: var(--fs-xs);
  }
  .nav-item.active {
    color: var(--primary);
  }

  @media (min-width: 900px) {
    .nav-bar {
      position: static;
      flex-direction: column;
      align-items: stretch;
      justify-content: flex-start;
      border-top: none;
      border-right: 1px solid var(--surface);
      width: 220px;
      flex-shrink: 0;
      height: 100dvh;
    }
    .nav-item {
      flex-direction: row;
      justify-content: flex-start;
      gap: var(--sp-3);
      padding: var(--sp-3) var(--sp-4);
      font-size: var(--fs-md);
      flex: unset;
    }
  }
</style>
