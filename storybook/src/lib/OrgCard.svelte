<script>
  import Badge from './Badge.svelte';
  import Icon from './Icon.svelte';

  // Summary of one Organization. The headline number is whatever the page is counting.
  let {
    name = '',
    badge,
    value = 0,
    unit = 'open',
    latest = '',
    meta = '',
    internal = false,
    onclick,
  } = $props();
</script>

<button class="org" {onclick}>
  <span class="row">
    <span class="title">
      <span class="name">{name}</span>
      {#if badge}<Badge tone={badge.tone} label={badge.label} caps />{/if}
    </span>
    <span class="value">{value}<small>{unit}</small></span>
  </span>
  <span class="row sub">
    <span class="latest"><Icon name={internal ? 'lock' : 'calendar'} size={15} />{latest}</span>
    <span class="meta">{meta}</span>
  </span>
</button>

<style>
  .org {
    display: grid;
    gap: 14px;
    width: 100%;
    padding: 18px 20px;
    border: 1px solid var(--c-border);
    border-radius: var(--r-lg);
    background: var(--c-surface);
    text-align: left;
    cursor: pointer;
    transition:
      border-color 0.12s,
      box-shadow 0.12s;
  }
  .org:hover {
    border-color: var(--c-primary-border);
    box-shadow: var(--shadow-md);
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-4);
    min-width: 0;
  }
  .title {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 10px;
    min-width: 0;
  }
  .name {
    font-size: var(--fs-lg);
    font-weight: 600;
  }
  .value {
    font-size: var(--fs-xl);
    font-weight: 700;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .value small {
    margin-left: 5px;
    font-size: var(--fs-sm);
    font-weight: 500;
    color: var(--c-text-3);
  }
  .sub {
    color: var(--c-text-3);
    font-size: var(--fs-sm);
  }
  .latest {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .meta {
    white-space: nowrap;
  }
</style>
