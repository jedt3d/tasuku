<script>
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';
  import { t } from '../i18n/index.svelte.js';

  // Writes a comment on the Timeline. Attaching a file is part of writing a comment.
  let {
    placeholder,
    value = $bindable(''),
    disabled = false,
    disabledReason = '',
    onsend,
  } = $props();
</script>

<div class="composer" class:disabled>
  {#if disabled}
    <p class="locked"><Icon name="lock" size={15} /> {disabledReason}</p>
  {:else}
    <textarea rows="2" placeholder={placeholder ?? t('composer.placeholder')} bind:value></textarea>
    <div class="bar">
      <button class="attach" aria-label={t('composer.attach')}><Icon name="paperclip" /></button>
      <span class="warn"
        ><Icon name="warning" size={14} /> {t('composer.warning')}</span
      >
      <Button variant="primary" size="sm" icon="send" label={t('common.send')} onclick={() => onsend?.(value)} />
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
