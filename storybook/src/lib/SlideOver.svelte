<script>
  import Icon from './Icon.svelte';

  // A side panel that slides in from the right and leaves the page behind it visible and usable.
  let { open = true, title = '', subtitle = '', width = 460, onclose, children, footer } = $props();
</script>

{#if open}
  <aside class="slideover" style="width:min({width}px, 100vw)" aria-label={title}>
    <header>
      <div>
        <h2>{title}</h2>
        {#if subtitle}<p>{subtitle}</p>{/if}
      </div>
      <button class="close" aria-label="Close" onclick={() => onclose?.()}><Icon name="x" /></button>
    </header>
    <div class="body">{@render children?.()}</div>
    {#if footer}<footer>{@render footer()}</footer>{/if}
  </aside>
{/if}

<style>
  .slideover {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    background: var(--c-surface);
    border-left: 1px solid var(--c-border);
    box-shadow: var(--shadow-lg);
    animation: in 0.22s ease-out;
  }
  @keyframes in {
    from {
      transform: translateX(32px);
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .slideover {
      animation: none;
    }
  }
  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--s-4);
    padding: var(--s-5) var(--s-6);
    border-bottom: 1px solid var(--c-border);
  }
  h2 {
    margin: 0;
    font-size: var(--fs-lg);
    font-weight: 600;
  }
  header p {
    margin: 2px 0 0;
    color: var(--c-text-3);
    font-size: var(--fs-sm);
  }
  .close {
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
  .close:hover {
    background: var(--c-surface-2);
  }
  .body {
    flex: 1;
    overflow-y: auto;
    padding: var(--s-6);
  }
  footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--s-3);
    padding: var(--s-4) var(--s-6);
    border-top: 1px solid var(--c-border);
    background: var(--c-surface-2);
  }
</style>
