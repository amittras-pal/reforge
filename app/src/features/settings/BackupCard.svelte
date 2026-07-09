<script lang="ts">
  import {
    applyImport,
    describeImportError,
    exportBackup,
    prepareImport,
    shouldShowBackupReminder,
    verifyImportSignature,
    type ImportSummary,
    type PreparedImport,
  } from '../../lib/backup'
  import { showToast } from '../../lib/stores/toast'
  import { createId } from '../../lib/utils'
  import Button from '../../lib/ui/Button.svelte'
  import Checkbox from '../../lib/ui/Checkbox.svelte'
  import ConfirmDialog from '../../lib/ui/ConfirmDialog.svelte'
  import SegmentedControl from '../../lib/ui/SegmentedControl.svelte'
  import TextField from '../../lib/ui/TextField.svelte'

  const fileInputId = createId()

  // Backup reminder (FR-05.14). Dismissal is session-only (not persisted) — it reappears next
  // time the 15-day/no-backup condition is still true.
  let showReminder = $state(false)
  async function refreshReminder() {
    showReminder = await shouldShowBackupReminder()
  }
  refreshReminder()

  // Export (FR-05.1–FR-05.4, FR-05.19)
  let signExport = $state(false)
  let exportPassphrase = $state('')
  let exporting = $state(false)

  async function handleExport() {
    exporting = true
    try {
      await exportBackup(
        signExport && exportPassphrase ? exportPassphrase : undefined,
      )
      showToast('Backup exported', 'success')
      await refreshReminder()
    } catch {
      showToast("Export failed — your data wasn't changed.", 'error')
    } finally {
      exporting = false
    }
  }

  // Import (FR-05.6–FR-05.13)
  let importMode = $state<'merge' | 'replace'>('merge')
  const importModeOptions = [
    { label: 'Merge', value: 'merge' },
    { label: 'Replace', value: 'replace' },
  ]

  let selectedFile = $state<File | null>(null)
  let prepared = $state<PreparedImport | null>(null)
  let prepareError = $state<string | null>(null)
  let importPassphrase = $state('')
  let signatureStatus = $state<'unchecked' | 'verified' | 'failed'>('unchecked')
  let acknowledgeMismatch = $state(false)
  let confirmReplaceOpen = $state(false)
  let importSummary = $state<ImportSummary | null>(null)
  let applying = $state(false)

  function resetImportPreview() {
    prepared = null
    prepareError = null
    importPassphrase = ''
    signatureStatus = 'unchecked'
    acknowledgeMismatch = false
    importSummary = null
  }

  async function handleFileSelected(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    resetImportPreview()
    selectedFile = file ?? null
    if (!file) return

    const result = await prepareImport(file)
    if (!result.ok) {
      prepareError = describeImportError(result.error)
      return
    }
    prepared = result.prepared
  }

  async function handleVerifySignature() {
    if (!selectedFile || !importPassphrase) return
    const ok = await verifyImportSignature(selectedFile, importPassphrase)
    signatureStatus = ok ? 'verified' : 'failed'
  }

  const canApply = $derived(
    prepared !== null &&
      (prepared.hashStatus !== 'mismatch' || acknowledgeMismatch),
  )

  function requestApply() {
    if (importMode === 'replace') {
      confirmReplaceOpen = true
    } else {
      void doApply()
    }
  }

  async function doApply() {
    if (!prepared) return
    applying = true
    try {
      // `prepared.data` is Svelte 5 `$state` (reactive Proxy) — IndexedDB's structured clone
      // can't clone that directly ("could not be cloned" DataCloneError), so unwrap it to a
      // plain object first.
      const data = $state.snapshot(prepared.data)
      importSummary = await applyImport(data, importMode)
      showToast('Import complete', 'success')
      prepared = null
      await refreshReminder()
    } catch {
      showToast("Import failed — your data wasn't changed.", 'error')
    } finally {
      applying = false
    }
  }
</script>

<div class="field-stack">
  {#if showReminder}
    <div class="reminder">
      <span>It's been a while since your last backup.</span>
      <Button size="sm" variant="ghost" onclick={() => (showReminder = false)}
        >Dismiss</Button
      >
    </div>
  {/if}

  <div class="section">
    <h3>Export</h3>
    <Checkbox label="Sign export with a passphrase" bind:checked={signExport} />
    {#if signExport}
      <TextField
        label="Passphrase"
        type="password"
        bind:value={exportPassphrase}
      />
    {/if}
    <Button onclick={handleExport} disabled={exporting}>
      {exporting ? 'Exporting…' : 'Export backup'}
    </Button>
  </div>

  <div class="section">
    <h3>Import</h3>
    <SegmentedControl
      label="Mode"
      options={importModeOptions}
      bind:value={importMode}
    />
    <p class="hint">
      {importMode === 'replace'
        ? 'Replace will erase current data and cannot be undone.'
        : 'Merge adds new records and updates existing ones by id.'}
    </p>
    <div class="file-picker">
      <input
        class="file-input-hidden"
        type="file"
        id={fileInputId}
        accept="application/json,.json"
        onchange={handleFileSelected}
      />
      <label class="file-picker-btn" for={fileInputId}>Choose file…</label>
      <span class="file-picker-name">{selectedFile ? selectedFile.name : 'No file chosen'}</span>
    </div>

    {#if prepareError}
      <p class="error-text">{prepareError}</p>
    {/if}

    {#if prepared}
      <div class="preview">
        <p>
          {#if prepared.hashStatus === 'verified'}
            Verified ✓
          {:else if prepared.hashStatus === 'mismatch'}
            ⚠ This file appears modified or corrupted
          {:else}
            Unverified (no checksum in this file)
          {/if}
        </p>

        {#if prepared.hashStatus === 'mismatch'}
          <Checkbox
            label="Import anyway (not recommended)"
            bind:checked={acknowledgeMismatch}
          />
        {/if}

        {#if prepared.hasSignature}
          <TextField
            label="Passphrase (to verify signature)"
            type="password"
            bind:value={importPassphrase}
          />
          <Button size="sm" variant="ghost" onclick={handleVerifySignature}>
            Verify signature
          </Button>
          {#if signatureStatus === 'verified'}
            <p class="success-text">Signature verified ✓</p>
          {:else if signatureStatus === 'failed'}
            <p class="error-text">Signature does not match this passphrase</p>
          {/if}
        {/if}

        <ul class="counts">
          {#each Object.entries(prepared.recordCounts) as [store, count] (store)}
            <li>{store}: {count}</li>
          {/each}
        </ul>

        <Button onclick={requestApply} disabled={!canApply || applying}>
          {applying ? 'Importing…' : 'Apply import'}
        </Button>
      </div>
    {/if}

    {#if importSummary}
      <div class="preview">
        <p>Import complete ({importSummary.mode}):</p>
        <ul class="counts">
          {#each Object.entries(importSummary.counts) as [store, { added, updated }] (store)}
            <li>{store}: +{added} added, {updated} updated</li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
</div>

<ConfirmDialog
  bind:open={confirmReplaceOpen}
  title="Replace all data?"
  message="Replace will erase current data and cannot be undone."
  confirmLabel="Replace"
  variant="danger"
  onConfirm={doApply}
/>

<style>
  .field-stack {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
  }
  .section {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }
  h3 {
    margin: 0;
    font-size: var(--fs-md);
    color: var(--text);
  }
  .hint {
    margin: 0;
    color: var(--muted);
    font-size: var(--fs-sm);
  }
  .file-picker {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    flex-wrap: wrap;
  }
  .file-input-hidden {
    /* Visually hidden but still focusable/clickable via the associated <label> — avoids
       the inconsistent native file-input button styling across browsers (FR-05 UI polish). */
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .file-input-hidden:focus-visible + .file-picker-btn {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }
  .file-picker-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: var(--touch-target-min);
    padding: 0 var(--sp-4);
    border-radius: var(--radius-md);
    border: 1px solid var(--muted);
    background: var(--surface);
    color: var(--text);
    font-size: var(--fs-md);
    font-weight: 600;
    cursor: pointer;
    flex-shrink: 0;
  }
  .file-picker-btn:hover {
    filter: brightness(0.95);
  }
  .file-picker-name {
    font-size: var(--fs-sm);
    color: var(--muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
  .reminder {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-3);
    padding: var(--sp-3);
    border-radius: var(--radius-md);
    background: var(--surface);
    font-size: var(--fs-sm);
    color: var(--text);
  }
  .preview {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
    padding: var(--sp-3);
    border-radius: var(--radius-md);
    background: var(--surface);
  }
  .counts {
    margin: 0;
    padding-left: var(--sp-4);
    font-size: var(--fs-sm);
    color: var(--muted);
  }
  .error-text {
    margin: 0;
    color: var(--danger);
    font-size: var(--fs-sm);
  }
  .success-text {
    margin: 0;
    color: var(--success);
    font-size: var(--fs-sm);
  }
</style>
