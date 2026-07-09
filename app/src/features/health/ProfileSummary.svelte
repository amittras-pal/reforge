<script lang="ts">
  import { push } from 'svelte-spa-router'
  import { profile } from '../../lib/stores/settings'
  import { ageFromBirthday } from '../../lib/utils'
  import { isProfileIncomplete } from './healthService'

  /**
   * Read-only global User Profile header (FR-09.1) shown on the report form and detail
   * screens, with a link to Settings (the only place it's edited, F-02).
   */
  const age = $derived($profile.birthday ? ageFromBirthday($profile.birthday) : undefined)
  const incomplete = $derived(isProfileIncomplete($profile))
</script>

<div class="profile-summary">
  <div class="profile-line">
    <span>{$profile.name || 'No name set'}</span>
    <span>·</span>
    <span>{age !== undefined ? `${age}y` : 'Age —'}</span>
    <span>·</span>
    <span>{$profile.heightCm !== undefined ? `${$profile.heightCm}cm` : 'Height —'}</span>
    <span>·</span>
    <span>{$profile.gender ?? 'Gender —'}</span>
  </div>
  <button type="button" class="edit-link" onclick={() => push('/settings')}>
    Edit in Settings
  </button>
</div>

{#if incomplete}
  <p class="incomplete-hint">
    Add your birthday, height, and gender in Settings to see them here — they're one-time
    global settings shared by every report.
  </p>
{/if}

<style>
  .profile-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--sp-2);
    font-size: var(--fs-sm);
    color: var(--muted);
  }
  .profile-line {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-1);
  }
  .edit-link {
    border: none;
    background: transparent;
    color: var(--primary);
    font-family: inherit;
    font-size: var(--fs-sm);
    font-weight: 600;
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
  }
  .incomplete-hint {
    margin: var(--sp-2) 0 0;
    font-size: var(--fs-sm);
    color: var(--muted);
  }
</style>
