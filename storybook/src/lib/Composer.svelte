<script>
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';

  let {
    placeholder = 'Write a comment…',
    value = $bindable(''),
    // Staff can post to the Timeline (Customer sees it) or into a Thread (Staff only).
    targets = [],
    target = $bindable(targets[0]?.id),
    disabled = false,
    disabledReason = '',
    onsend,
  } = $props();

  const internal = $derived(target === 'thread');
</script>

<div class="composer" class:internal class:disabled>
  {#if disabled}
    <p class="locked"><Icon name="lock" size={15} /> {disabledReason}</p>
  {:else}
    {#if targets.length > 1}
      <div class="targets" role="group" aria-label="Post to">
        {#each targets as t (t.id)}
          <button class:active={t.id === target} onclick={() => (target = t.id)}>
            <Icon name={t.id === 'thread' ? 'lock' : 'message'} size={14} />{t.label}
          </button>
        {/each}
      </div>
    {/if}
    <textarea rows="2" {placeholder} bind:value></textarea>
    <div class="bar">
      <button class="attach" aria-label="Attach an image or PDF"><Icon name="paperclip" /></button>
      <span class="warn"
        ><Icon name="warning" size={14} /> Images and PDF up to 10 MB. Never attach patient
        information.</span
      >
      <Button variant="primary" size="sm" icon="send" label="Send" onclick={() => onsend?.(value)} />
    </div>
  {/if}
</div>

<style>
  .composer {
    border: 1px solid var(--c-border-strong);
    border-radius: var(--r-lg);
    background: var(--c-surface);
    box-shadow: var(--shadow-sm);
  }
  .composer:focus-within {
    border-color: var(--c-primary);
    box-shadow: 0 0 0 3px var(--c-primary-soft);
  }
  .internal {
    border-style: dashed;
    border-color: var(--c-primary-border);
    background: #fbfaff;
  }
  .disabled {
    background: var(--c-surface-2);
    box-shadow: none;
  }
  .locked {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    padding: 14px 16px;
    color: var(--c-text-3);
  }
  .targets {
    display: flex;
    gap: 4px;
    padding: 8px 8px 0;
  }
  .targets button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 28px;
    padding: 0 10px;
    border: 0;
    border-radius: 7px;
    background: none;
    color: var(--c-text-3);
    font-size: var(--fs-sm);
    font-weight: 500;
    cursor: pointer;
  }
  .targets button.active {
    background: var(--c-primary-soft);
    color: var(--c-primary-hover);
  }
  textarea {
    display: block;
    width: 100%;
    padding: 12px 16px 4px;
    border: 0;
    outline: 0;
    background: none;
    resize: none;
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 8px 8px;
  }
  .attach {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border: 0;
    border-radius: 8px;
    background: none;
    color: var(--c-text-2);
    cursor: pointer;
  }
  .attach:hover {
    background: var(--c-surface-2);
  }
  .warn {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
    font-size: var(--fs-xs);
    color: var(--c-text-3);
  }
</style>
