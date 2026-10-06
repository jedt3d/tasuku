<script>
  import Avatar from './Avatar.svelte';
  import Badge from './Badge.svelte';
  import Icon from './Icon.svelte';

  // entries: { kind: 'comment' | 'event' | 'thread' | 'deleted' | 'more', ... }
  // viewer "customer" never receives Threads; here it also hides them, to show the Customer's view.
  let { entries = [], viewer = 'staff', cards = false } = $props();

  const visible = $derived(
    viewer === 'customer' ? entries.filter((e) => e.kind !== 'thread') : entries,
  );
</script>

<ol class="timeline" class:cards>
  {#each visible as entry, i (i)}
    <li class="entry">
      <div class="rail">
        {#if entry.kind === 'comment'}
          <Avatar name={entry.author} size={40} />
        {:else if entry.kind === 'thread'}
          <span class="node branch"><Icon name="thread" size={15} /></span>
        {:else}
          <span class="node"
            ><Icon name={entry.kind === 'more' ? 'more' : (entry.icon ?? 'activity')} size={14} /></span
          >
        {/if}
      </div>

      <div class="content">
        {#if entry.kind === 'comment'}
          <div class="head">
            <strong>{entry.author}</strong>
            {#if entry.role}<span class="role">{entry.role}</span>{/if}
            <time>{entry.time}</time>
            {#if entry.edited}<span class="muted">· edited</span>{/if}
          </div>
          <div class="bubble">
            <p>{entry.text}</p>
            {#if entry.files}
              <div class="files">
                {#each entry.files as file (file.name)}
                  <span class="file">
                    <span class="thumb {file.kind}"
                      ><Icon name={file.kind === 'pdf' ? 'file' : 'image'} size={16} /></span
                    >
                    <span class="fname">{file.name}</span>
                    <span class="muted">{file.size}</span>
                  </span>
                {/each}
              </div>
            {/if}
          </div>
        {:else if entry.kind === 'event'}
          <p class="event">
            <strong>{entry.actor}</strong>
            {entry.text}
            {#if entry.status}<Badge status={entry.status} />{/if}
            <time>{entry.time}</time>
          </p>
        {:else if entry.kind === 'deleted'}
          <p class="event muted">A comment was removed by a Task Master <time>{entry.time}</time></p>
        {:else if entry.kind === 'more'}
          <button class="more">View {entry.count} earlier entries</button>
        {:else if entry.kind === 'thread'}
          <section class="thread" aria-label="Thread: {entry.title}">
            <header>
              <span class="tlabel"><Icon name="lock" size={13} /> Thread · Staff only</span>
              <strong>{entry.title}</strong>
              <Badge status={entry.status} />
              <span class="resp"><Avatar name={entry.responsible} size={22} />{entry.responsible}</span>
            </header>
            {#each entry.messages as message, m (m)}
              <div class="reply">
                <Avatar name={message.author} size={26} />
                <div>
                  <span class="rhead"><strong>{message.author}</strong><time>{message.time}</time></span>
                  <p>{message.text}</p>
                </div>
              </div>
            {/each}
            {#if entry.more}<button class="more">View {entry.more} more replies</button>{/if}
          </section>
        {/if}
      </div>
    </li>
  {/each}
</ol>

<style>
  .timeline {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .entry {
    position: relative;
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr);
    gap: 14px;
    padding-bottom: 22px;
  }
  /* The line that makes it a timeline: drawn from each node down to the next one. */
  .entry:not(:last-child)::before {
    content: '';
    position: absolute;
    left: 19px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--c-border);
  }
  .rail {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }
  .node {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--c-slate-bg);
    color: var(--c-slate-fg);
    box-shadow: 0 0 0 4px var(--c-surface);
  }
  .rail :global(.avatar) {
    box-shadow: 0 0 0 4px var(--c-surface);
  }
  .node.branch {
    background: var(--c-primary-soft);
    color: var(--c-primary-hover);
  }

  .head {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px;
    min-height: 22px;
  }
  .role {
    padding: 0 7px;
    border-radius: var(--r-pill);
    background: var(--c-slate-bg);
    color: var(--c-slate-fg);
    font-size: 11px;
    font-weight: 600;
  }
  time,
  .muted {
    color: var(--c-text-3);
    font-size: var(--fs-sm);
  }
  p {
    margin: 0;
  }
  .bubble p {
    margin-top: 2px;
    color: var(--c-text-2);
    max-width: 68ch;
    white-space: pre-line;
  }
  .cards .bubble {
    margin-top: 6px;
    padding: 12px 16px;
    border: 1px solid var(--c-border);
    border-radius: var(--r-lg);
    background: var(--c-surface);
  }
  .files {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
  }
  .file {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px 6px 6px;
    border: 1px solid var(--c-border);
    border-radius: var(--r-md);
    background: var(--c-surface);
    font-size: var(--fs-sm);
  }
  .thumb {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 7px;
    background: var(--c-blue-bg);
    color: var(--c-blue-fg);
  }
  .thumb.pdf {
    background: var(--c-red-bg);
    color: var(--c-red-fg);
  }
  .fname {
    font-weight: 500;
  }

  .event {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    min-height: 28px;
    color: var(--c-text-2);
  }
  .event strong {
    color: var(--c-text);
  }

  .more {
    height: 28px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--c-primary-hover);
    font-weight: 500;
    cursor: pointer;
  }

  .thread {
    display: grid;
    gap: 12px;
    padding: 12px 14px;
    border: 1px dashed var(--c-primary-border);
    border-radius: var(--r-lg);
    background: #fbfaff;
  }
  .thread header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 10px;
  }
  .tlabel {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: var(--c-primary-hover);
    font-size: var(--fs-xs);
    font-weight: 600;
  }
  .resp {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
    color: var(--c-text-3);
    font-size: var(--fs-sm);
  }
  .reply {
    display: grid;
    grid-template-columns: 26px minmax(0, 1fr);
    gap: 10px;
  }
  .rhead {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-size: var(--fs-sm);
  }
  .reply p {
    color: var(--c-text-2);
  }
</style>
