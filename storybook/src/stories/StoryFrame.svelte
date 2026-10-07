<script>
  // Wraps every story: applies the theme and language chosen in the toolbar, shows the story's
  // design notes in that language, then the story itself.
  import { i18n, setLocale } from '../i18n/index.svelte.js';
  import { notes } from '../i18n/notes/index.js';

  let { children, theme = 'light', locale = 'en', note, show = true, fullscreen = false } = $props();

  // An effect, because a decorator runs while Svelte is rendering and may not change state itself.
  $effect.pre(() => {
    document.documentElement.dataset.theme = theme;
    setLocale(locale);
  });

  const text = $derived(notes[i18n.locale]);
  const entry = $derived(note ? (text[note] ?? notes.en[note]) : null);
</script>

<!-- Text between backticks is shown as code. -->
{#snippet rich(line)}
  {#each line.split('`') as part, i (i)}{#if i % 2}<code>{part}</code>{:else}{part}{/if}{/each}
{/snippet}

{#if entry && show}
  <!-- Open beside a component; folded above a full screen so the prototype stays the main thing. -->
  <details class="notes" class:fullscreen open={!fullscreen}>
    <summary><span class="tag">{text.labels.notes}</span>{entry.title}</summary>
    <div class="body">
      <section>
        <h4>{text.labels.purpose}</h4>
        <p>{@render rich(entry.purpose)}</p>
      </section>
      <section>
        <h4>{text.labels.why}</h4>
        <ul>
          {#each entry.why as line (line)}<li>{@render rich(line)}</li>{/each}
        </ul>
      </section>
      <section>
        <h4>{text.labels.use}</h4>
        <ul>
          {#each entry.use as line (line)}<li>{@render rich(line)}</li>{/each}
        </ul>
      </section>
    </div>
  </details>
{/if}

{@render children()}

<style>
  .notes {
    margin-bottom: var(--s-6);
    border: 1px solid var(--c-border);
    border-left: 3px solid var(--c-primary);
    border-radius: var(--r-md);
    background: var(--c-surface);
    color: var(--c-text-2);
  }
  .notes.fullscreen {
    margin: 0;
    border-width: 0 0 1px 3px;
    border-radius: 0;
  }
  summary {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    color: var(--c-text);
    font-weight: 600;
    cursor: pointer;
  }
  .tag {
    padding: 1px 8px;
    border-radius: var(--r-pill);
    background: var(--c-primary-soft);
    color: var(--c-primary-text);
    font-size: var(--fs-xs);
  }
  .body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.7fr) minmax(0, 1.2fr);
    gap: var(--s-6);
    padding: 4px 16px 16px;
  }
  h4 {
    margin: 0 0 6px;
    color: var(--c-text-3);
    font-size: var(--fs-xs);
    font-weight: 600;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }
  p {
    margin: 0;
  }
  ul {
    display: grid;
    gap: 8px;
    margin: 0;
    padding-left: 18px;
  }
  code {
    padding: 1px 5px;
    border-radius: 5px;
    background: var(--c-surface-2);
    border: 1px solid var(--c-border);
    font-size: 0.92em;
  }
  @media (max-width: 900px) {
    .body {
      grid-template-columns: minmax(0, 1fr);
      gap: var(--s-4);
    }
  }
</style>
