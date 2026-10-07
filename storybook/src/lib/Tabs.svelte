<script>
  // variant "pill" for filters on a toolbar, "underline" for switching views of one page.
  let { items = [], active = $bindable(), variant = 'pill', onselect } = $props();

  function pick(id) {
    active = id;
    onselect?.(id);
  }
</script>

<div class="tabs {variant}" role="tablist">
  {#each items as item (item.id)}
    <button
      role="tab"
      aria-selected={active === item.id}
      class:active={active === item.id}
      onclick={() => pick(item.id)}
    >
      {item.label}{#if item.count != null}<span class="count">{item.count}</span>{/if}
    </button>
  {/each}
</div>

<style>
  .tabs {
    display: flex;
    align-items: center;
    max-width: 100%;
    overflow-x: auto;
    scrollbar-width: none;
  }
  button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 0;
    background: none;
    color: var(--c-text-2);
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
  }
  .count {
    min-width: 20px;
    padding: 0 6px;
    border-radius: var(--r-pill);
    background: var(--c-primary-soft);
    color: var(--c-primary-text);
    font-size: var(--fs-xs);
    font-weight: 600;
    text-align: center;
  }

  .pill {
    gap: 2px;
    padding: 4px;
    border-radius: var(--r-md);
    background: var(--c-surface-2);
  }
  .pill button {
    height: 34px;
    padding: 0 14px;
    border-radius: 8px;
  }
  .pill button.active {
    background: var(--c-surface);
    color: var(--c-primary-text);
    box-shadow: var(--shadow-sm);
  }

  .underline {
    gap: 6px;
    border-bottom: 1px solid var(--c-border);
  }
  .underline button {
    height: 44px;
    padding: 0 12px;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    color: var(--c-text-3);
  }
  .underline button.active {
    color: var(--c-primary-text);
    border-bottom-color: var(--c-primary);
  }
</style>
