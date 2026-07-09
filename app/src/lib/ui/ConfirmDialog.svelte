<script lang="ts">
  import Button from './Button.svelte'
  import Dialog from './Dialog.svelte'

  let {
    open = $bindable(false),
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'primary',
    onConfirm,
  }: {
    open?: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'primary' | 'danger'
    onConfirm: () => void
  } = $props()

  function confirm() {
    open = false
    onConfirm()
  }

  function cancel() {
    open = false
  }
</script>

<Dialog bind:open {title}>
  <p class="message">{message}</p>
  <div class="actions">
    <Button variant="secondary" onclick={cancel}>{cancelLabel}</Button>
    <Button {variant} onclick={confirm}>{confirmLabel}</Button>
  </div>
</Dialog>

<style>
  .message {
    margin: 0 0 var(--sp-4);
    color: var(--text);
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--sp-2);
  }
</style>
