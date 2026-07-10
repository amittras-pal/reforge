<script lang="ts">
  import { untrack } from 'svelte'
  import type { Density, Theme, Weekday } from '../../lib/domain'
  import { appBarAction, pageTitle } from '../../lib/stores/shell'
  import {
    density,
    exampleProgramDismissed,
    profile,
    resetSettings,
    theme,
    weekStartsOn,
  } from '../../lib/stores/settings'
  import { showToast } from '../../lib/stores/toast'
  import {
    appInstalled,
    installPromptAvailable,
    isIOS,
    isStandalone,
    promptInstall,
  } from '../../lib/pwa/install'
  import {
    getStorageUsage,
    isStoragePersisted,
    requestPersistentStorage,
    type StorageUsage,
  } from '../../lib/pwa/storage'
  import { formatBytes } from '../../lib/utils'
  import Button from '../../lib/ui/Button.svelte'
  import Card from '../../lib/ui/Card.svelte'
  import ConfirmDialog from '../../lib/ui/ConfirmDialog.svelte'
  import SegmentedControl from '../../lib/ui/SegmentedControl.svelte'
  import Select from '../../lib/ui/Select.svelte'
  import ExampleProgramCard from '../configurator/ExampleProgramCard.svelte'
  import UsageGuideSheet from '../configurator/UsageGuideSheet.svelte'
  import TextField from '../../lib/ui/TextField.svelte'
  import BackupCard from './BackupCard.svelte'

  let confirmResetOpen = $state(false)
  let guideOpen = $state(false)

  $effect(() => {
    pageTitle.set('Settings')
    appBarAction.set({
      label: 'Reset',
      onClick: () => (confirmResetOpen = true),
    })
    return () => appBarAction.set(null)
  })

  // Local, editable copies — seeded from the stores on load, written back on change
  // (FR-02.16, FR-02.17). Kept as plain strings so they bind cleanly to the generic
  // TextField/Select/SegmentedControl primitives; cast to the precise domain type only
  // when writing back to the stores.
  let name = $state($profile.name ?? '')
  let birthday = $state($profile.birthday ?? '')
  let heightCm = $state(
    $profile.heightCm !== undefined ? String($profile.heightCm) : '',
  )
  let gender = $state<string>($profile.gender ?? '')
  let weekStart = $state(String($weekStartsOn))
  let themeValue = $state<string>($theme)
  let densityValue = $state<string>($density)

  // These fields are only a one-way *outbound* echo of the store below by default, so an
  // *external* change to the store (import — FR-05.10/Notes for Improvement.md: imported
  // profile data wasn't showing up anywhere, including here if Settings was already open)
  // would otherwise never be reflected back into these fields. Each pair of effects below
  // compares against the last value *this component* wrote out to tell "the store changed
  // because we typed" (ignore — already showing the right thing) apart from "the store
  // changed some other way" (e.g. import — resync the fields from it).
  let lastWrittenProfile = untrack(() => JSON.stringify($profile))
  let lastWrittenWeekStart = untrack(() => $weekStartsOn)
  let lastWrittenTheme = untrack(() => $theme)
  let lastWrittenDensity = untrack(() => $density)

  $effect(() => {
    const next = {
      name: name || undefined,
      birthday: birthday || undefined,
      heightCm: heightCm ? Number(heightCm) : undefined,
      gender: (gender || undefined) as 'male' | 'female' | 'other' | undefined,
    }
    lastWrittenProfile = JSON.stringify(next)
    profile.set(next)
  })

  $effect(() => {
    const serialized = JSON.stringify($profile)
    if (serialized === lastWrittenProfile) return
    lastWrittenProfile = serialized
    name = $profile.name ?? ''
    birthday = $profile.birthday ?? ''
    heightCm = $profile.heightCm !== undefined ? String($profile.heightCm) : ''
    gender = $profile.gender ?? ''
  })

  $effect(() => {
    const next = Number(weekStart) as Weekday
    lastWrittenWeekStart = next
    weekStartsOn.set(next)
  })

  $effect(() => {
    if ($weekStartsOn === lastWrittenWeekStart) return
    lastWrittenWeekStart = $weekStartsOn
    weekStart = String($weekStartsOn)
  })

  $effect(() => {
    const next = themeValue as Theme
    lastWrittenTheme = next
    theme.set(next)
  })

  $effect(() => {
    if ($theme === lastWrittenTheme) return
    lastWrittenTheme = $theme
    themeValue = $theme
  })

  $effect(() => {
    const next = densityValue as Density
    lastWrittenDensity = next
    density.set(next)
  })

  $effect(() => {
    if ($density === lastWrittenDensity) return
    lastWrittenDensity = $density
    densityValue = $density
  })

  function handleReset() {
    resetSettings()
    name = ''
    birthday = ''
    heightCm = ''
    gender = ''
    weekStart = '0'
    themeValue = 'system'
    densityValue = 'medium'
    showToast('Settings reset to defaults', 'success')
  }

  // App & Storage (F-04). `showIOSGuidance` is computed once — iOS never fires
  // `beforeinstallprompt`, so Settings shows static "Add to Home Screen" instructions instead.
  const showIOSGuidance = isIOS() && !isStandalone()
  let storagePersisted = $state(false)
  let storageUsage = $state<StorageUsage | undefined>(undefined)

  async function loadStorageInfo() {
    storagePersisted = await isStoragePersisted()
    storageUsage = await getStorageUsage()
  }
  loadStorageInfo()

  async function handleInstall() {
    const outcome = await promptInstall()
    if (outcome === 'accepted') showToast('App installed', 'success')
  }

  async function handleRequestPersistence() {
    const granted = await requestPersistentStorage()
    storagePersisted = granted
    showToast(
      granted
        ? 'Storage is now persistent'
        : 'The browser did not grant persistent storage',
      granted ? 'success' : 'info',
    )
  }

  const genderOptions = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
  ]
  const themeOptions = [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
    { label: 'System', value: 'system' },
  ]
  const densityOptions = [
    { label: 'Comfortable', value: 'comfortable' },
    { label: 'Medium', value: 'medium' },
    { label: 'Compact', value: 'compact' },
  ]
  const weekdayOptions = [
    { label: 'Sunday', value: '0' },
    { label: 'Monday', value: '1' },
    { label: 'Tuesday', value: '2' },
    { label: 'Wednesday', value: '3' },
    { label: 'Thursday', value: '4' },
    { label: 'Friday', value: '5' },
    { label: 'Saturday', value: '6' },
  ]
</script>

<div class="settings">
  <Card>
    <h2>Profile</h2>
    <div class="field-stack">
      <TextField label="Name" bind:value={name} placeholder="Your name" />
      <TextField label="Birthday" type="date" bind:value={birthday} />
      <TextField
        label="Height (cm)"
        type="number"
        bind:value={heightCm}
        placeholder="e.g. 175"
      />
      <SegmentedControl
        label="Gender"
        options={genderOptions}
        bind:value={gender}
      />
    </div>
  </Card>

  <Card>
    <h2>Calendar</h2>
    <div class="field-stack">
      <Select
        label="Week starts on"
        options={weekdayOptions}
        bind:value={weekStart}
      />
    </div>
  </Card>

  <Card>
    <h2>Appearance</h2>
    <div class="field-stack">
      <SegmentedControl
        label="Theme"
        options={themeOptions}
        bind:value={themeValue}
      />
      <SegmentedControl
        label="Density"
        options={densityOptions}
        bind:value={densityValue}
      />
    </div>
  </Card>

  <Card>
    <h2>Workout setup</h2>
    {#if !$exampleProgramDismissed}
      <ExampleProgramCard
        onLoaded={() => exampleProgramDismissed.set(true)}
        onDismiss={() => exampleProgramDismissed.set(true)}
      />
    {/if}
    <button type="button" class="guide-link" onclick={() => (guideOpen = true)}>
      How should I structure a training day?
    </button>
  </Card>

  <Card>
    <h2>Backup</h2>
    <BackupCard />
  </Card>

  <Card>
    <h2>App &amp; Storage</h2>
    <div class="field-stack">
      {#if $appInstalled}
        <p class="placeholder-text">This app is installed.</p>
      {:else if showIOSGuidance}
        <p class="placeholder-text">
          To install, tap the Share icon, then "Add to Home Screen".
        </p>
      {:else if $installPromptAvailable}
        <Button size="sm" onclick={handleInstall}>Install app</Button>
      {/if}

      <div class="storage-row">
        <span>Persistent storage</span>
        <span>{storagePersisted ? 'On' : 'Off'}</span>
      </div>
      {#if !storagePersisted}
        <Button size="sm" onclick={handleRequestPersistence}>
          Make storage persistent
        </Button>
      {/if}
      {#if storageUsage}
        <p class="placeholder-text">
          {formatBytes(storageUsage.usageBytes)} used of {formatBytes(
            storageUsage.quotaBytes,
          )}
        </p>
      {/if}
    </div>
  </Card>
</div>

<ConfirmDialog
  bind:open={confirmResetOpen}
  title="Reset settings?"
  message="This resets your profile, theme, density, and week-start preference to their defaults."
  confirmLabel="Reset"
  variant="danger"
  onConfirm={handleReset}
/>

<UsageGuideSheet bind:open={guideOpen} />

<style>
  .settings {
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
  .field-stack {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }
  .placeholder-text {
    margin: 0;
    color: var(--muted);
    font-size: var(--fs-sm);
  }
  .storage-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: var(--fs-sm);
    color: var(--text);
  }
  .guide-link {
    align-self: center;
    display: block;
    margin: var(--sp-3) auto 0;
    border: none;
    background: transparent;
    color: var(--primary);
    font-family: inherit;
    font-size: var(--fs-sm);
    font-weight: 600;
    text-decoration: underline;
    cursor: pointer;
    min-height: var(--touch-target-min);
  }
</style>
