<script>
  import Icon from './Icon.svelte';

  let {
    label = '',
    variant = 'secondary',
    size = 'md',
    icon,
    iconRight,
    block = false,
    disabled = false,
    children,
    ...rest
  } = $props();
</script>

<button class="btn {variant} {size}" class:block {disabled} {...rest}>
  {#if icon}<Icon name={icon} size={size === 'sm' ? 15 : 17} />{/if}
  {#if children}{@render children()}{:else if label}<span>{label}</span>{/if}
  {#if iconRight}<Icon name={iconRight} size={15} />{/if}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 40px;
    padding: 0 16px;
    border: 1px solid transparent;
    border-radius: var(--r-md);
    font-weight: 600;
    font-size: var(--fs-md);
    white-space: nowrap;
    cursor: pointer;
    transition:
      background 0.12s,
      border-color 0.12s;
  }
  .sm {
    height: 32px;
    padding: 0 12px;
    font-size: var(--fs-sm);
    border-radius: 8px;
  }
  .block {
    width: 100%;
  }
  .primary {
    background: var(--c-primary);
    color: var(--c-on-primary);
    box-shadow: var(--shadow-sm);
  }
  .primary:hover:not(:disabled) {
    background: var(--c-primary-hover);
  }
  .secondary {
    background: var(--c-surface);
    border-color: var(--c-border-strong);
    color: var(--c-text);
  }
  .secondary:hover:not(:disabled) {
    background: var(--c-surface-2);
  }
  .soft {
    background: var(--c-primary-soft);
    color: var(--c-primary-text);
  }
  .soft:hover:not(:disabled) {
    border-color: var(--c-primary-border);
  }
  .ghost {
    background: transparent;
    color: var(--c-primary-text);
    padding: 0 8px;
  }
  .ghost:hover:not(:disabled) {
    background: var(--c-primary-soft);
  }
  .danger {
    background: var(--c-surface);
    border-color: var(--c-red-border);
    color: var(--c-red-fg);
  }
  .danger:hover:not(:disabled) {
    background: var(--c-red-bg);
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
