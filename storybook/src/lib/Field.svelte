<script>
  import Icon from './Icon.svelte';

  let {
    label = '',
    type = 'text',
    value = $bindable(''),
    placeholder = '',
    options = [],
    icon,
    hint = '',
    action = '',
  } = $props();

  // A select with no value would render blank; start on its first option.
  if (type === 'select' && !value && options.length) value = options[0];
</script>

<label class="field">
  {#if label}
    <span class="lbl">{label}{#if action}<span class="action">{action}</span>{/if}</span>
  {/if}
  <span class="control" class:area={type === 'textarea'}>
    {#if icon}<Icon name={icon} size={16} />{/if}
    {#if type === 'select'}
      <select bind:value>
        {#each options as option}<option>{option}</option>{/each}
      </select>
      <span class="chev"><Icon name="chevronDown" size={15} /></span>
    {:else if type === 'textarea'}
      <textarea rows="4" {placeholder} bind:value></textarea>
    {:else}
      <input {type} {placeholder} {value} oninput={(e) => (value = e.currentTarget.value)} />
    {/if}
  </span>
  {#if hint}<span class="hint">{hint}</span>{/if}
</label>

<style>
  .field {
    display: grid;
    gap: 6px;
  }
  .lbl {
    display: flex;
    justify-content: space-between;
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--c-text);
  }
  .action {
    color: var(--c-primary-hover);
    font-weight: 500;
  }
  .control {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    padding: 0 12px;
    border: 1px solid var(--c-border-strong);
    border-radius: var(--r-md);
    background: var(--c-surface);
    color: var(--c-text-3);
  }
  .control:focus-within {
    border-color: var(--c-primary);
    box-shadow: 0 0 0 3px var(--c-primary-soft);
  }
  .area {
    align-items: flex-start;
    padding: 10px 12px;
  }
  input,
  select,
  textarea {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    background: none;
    color: var(--c-text);
    appearance: none;
  }
  textarea {
    resize: vertical;
  }
  select {
    padding-right: 20px;
    cursor: pointer;
  }
  ::placeholder {
    color: var(--c-text-3);
  }
  .chev {
    position: absolute;
    right: 12px;
    pointer-events: none;
  }
  .hint {
    font-size: var(--fs-xs);
    color: var(--c-text-3);
  }
</style>
