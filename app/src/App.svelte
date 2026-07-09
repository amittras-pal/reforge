<script lang="ts">
  import Router from 'svelte-spa-router'
  import { routes } from './lib/router/routes'
  import AppBar from './lib/ui/AppBar.svelte'
  import NavBar from './lib/ui/NavBar.svelte'
  import Toast from './lib/ui/Toast.svelte'
  import UpdateBanner from './lib/ui/UpdateBanner.svelte'
</script>

<div class="shell">
  <NavBar />
  <div class="shell-main">
    <AppBar />
    <main class="content">
      <Router {routes} />
    </main>
  </div>
</div>
<Toast />
<UpdateBanner />

<style>
  .shell {
    display: flex;
    flex-direction: column;
    /* Fixed (not min-) height + hidden overflow so `.content` below is the only scrolling
       region. Without this, long screens (e.g. Health/Settings) grow `.shell` taller than the
       viewport, and on desktop — where NavBar becomes `position: static` inside this flex row
       — the whole page (including the sidebar) scrolls with it instead of just the content. */
    height: 100dvh;
    overflow: hidden;
    background: var(--bg);
  }
  .shell-main {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }
  .content {
    flex: 1;
    overflow-y: auto;
    width: 100%;
    max-width: 720px;
    margin: 0 auto;
    padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
  }

  @media (min-width: 900px) {
    .shell {
      flex-direction: row;
    }
    .content {
      padding-bottom: var(--sp-4);
    }
  }
</style>
