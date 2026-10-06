<script>
  import Icon from './Icon.svelte';

  let { icon = 'plus', label = '', tone = 'default', disabled = false, onclick } = $props();
</script>

<button class="qa {tone}" {disabled} {onclick} title={label}>
  <span class="tile"><Icon name={icon} size={22} /></span>
  <span class="label">{label}</span>
</button>

<style>
  .qa {
    display: grid;
    justify-items: center;
    gap: 8px;
    width: 72px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--c-text-2);
    font-size: var(--fs-sm);
    font-weight: 500;
    line-height: 1.25;
    text-align: center;
    cursor: pointer;
  }
  .tile {
    display: grid;
    place-items: center;
    width: 64px;
    height: 60px;
    border: 1px solid var(--c-border);
    border-radius: var(--r-md);
    background: var(--c-surface);
    color: var(--c-primary);
    transition:
      border-color 0.12s,
      background 0.12s;
  }
  .qa:hover:not(:disabled) .tile {
    border-color: var(--c-primary-border);
    background: var(--c-primary-soft);
  }
  .danger .tile {
    color: var(--c-red-fg);
  }
  .qa.danger:hover:not(:disabled) .tile {
    border-color: #f3b9b9;
    background: var(--c-red-bg);
  }
  .qa:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
</style>
