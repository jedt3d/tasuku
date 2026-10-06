<script>
  import Avatar from './Avatar.svelte';
  import Badge from './Badge.svelte';
  import Icon from './Icon.svelte';

  // entries: { kind: 'comment' | 'event' | 'deleted' | 'more', threads?: [...] }
  // A Thread hangs off the entry it was started from. Customers never receive Threads.
  // actions: the viewer may write on this Task, so entries offer "Start Thread".
  let { entries = [], viewer = 'staff', cards = false, actions = false, onthread } = $props();

  const staffView = $derived(viewer !== 'customer');
</script>

{#snippet tools(entry)}
  {#if staffView && actions}
    <span class="tools">
      <button class="tool" onclick={() => onthread?.(entry)}><Icon name="thread" size={14} />Start Thread</button>
    </span>
  {/if}
{/snippet}

<ol class="timeline" class:cards>
  {#each entries as entry, i (i)}
    <li class="entry">
      <div class="rail">
        {#if entry.kind === 'comment'}
          <Avatar name={entry.author} size={40} />
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
            {@render tools(entry)}
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
          <p class="line">
            <strong>{entry.actor}</strong>
            {entry.text}
            {#if entry.status}<Badge status={entry.status} />{/if}
            <time>{entry.time}</time>
            {@render tools(entry)}
          </p>
        {:else if entry.kind === 'deleted'}
          <p class="line muted">A comment was removed by a Task Master <time>{entry.time}</time></p>
        {:else if entry.kind === 'more'}
          <button class="morebtn">View {entry.count} earlier entries</button>
        {/if}

        {#if staffView && entry.threads}
          {#each entry.threads as thread (thread.title)}
            <section class="threadbox" aria-label="Thread: {thread.title}">
              <header>
                <span class="tlabel"><Icon name="lock" size={13} /> Thread · Staff only</span>
                <strong>{thread.title}</strong>
                <Badge status={thread.status} />
                <span class="resp"><Avatar name={thread.responsible} size={22} />{thread.responsible}</span>
              </header>
              {#each thread.messages as message, m (m)}
                <div class="reply">
                  <Avatar name={message.author} size={26} />
                  <div>
                    <span class="rhead"><strong>{message.author}</strong><time>{message.time}</time></span>
                    <p>{message.text}</p>
                  </div>
                </div>
              {/each}
              {#if thread.more}<button class="morebtn">View {thread.more} more replies</button>{/if}
              {#if actions && thread.status === 'open'}
                <div class="treply">
                  <input placeholder="Reply in this Thread…" aria-label="Reply in this Thread" />
                  <button class="tool">Mark Settled</button>
                </div>
              {/if}
            </section>
          {/each}
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

  .line {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    min-height: 28px;
    color: var(--c-text-2);
  }
  .line strong {
    color: var(--c-text);
  }

  /* Actions on an entry: shown on hover or focus, and always where there is no hover. */
  .tools {
    margin-left: auto;
    opacity: 0;
    transition: opacity 0.12s;
  }
  .entry:hover .tools,
  .tools:focus-within {
    opacity: 1;
  }
  @media (hover: none) {
    .tools {
      opacity: 1;
    }
  }
  .tool {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 26px;
    padding: 0 9px;
    border: 1px solid var(--c-border);
    border-radius: 7px;
    background: var(--c-surface);
    color: var(--c-primary-hover);
    font-size: var(--fs-xs);
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
  }
  .tool:hover {
    border-color: var(--c-primary-border);
    background: var(--c-primary-soft);
  }

  .morebtn {
    height: 28px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--c-primary-hover);
    font-weight: 500;
    cursor: pointer;
  }

  .threadbox {
    position: relative;
    display: grid;
    gap: 12px;
    margin-top: 12px;
    padding: 12px 14px;
    border: 1px dashed var(--c-primary-border);
    border-radius: var(--r-lg);
    background: #fbfaff;
  }
  /* The branch: an elbow from the Timeline's line into the Thread. */
  .threadbox::before {
    content: '';
    position: absolute;
    left: -35px;
    top: -12px;
    width: 34px;
    height: 34px;
    border-left: 2px solid var(--c-primary-border);
    border-bottom: 2px solid var(--c-primary-border);
    border-bottom-left-radius: 14px;
  }
  .threadbox header {
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
  .treply {
    display: flex;
    gap: 8px;
  }
  .treply input {
    flex: 1;
    min-width: 0;
    height: 32px;
    padding: 0 10px;
    border: 1px solid var(--c-primary-border);
    border-radius: 8px;
    background: var(--c-surface);
    font-size: var(--fs-sm);
  }
  .treply .tool {
    height: 32px;
  }
</style>
