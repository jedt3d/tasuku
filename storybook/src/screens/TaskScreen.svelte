<script>
  // PROTOTYPE: the Staff view of one Task. Mock data only, nothing is saved.
  import Avatar from '../lib/Avatar.svelte';
  import Badge from '../lib/Badge.svelte';
  import Button from '../lib/Button.svelte';
  import Composer from '../lib/Composer.svelte';
  import Field from '../lib/Field.svelte';
  import Icon from '../lib/Icon.svelte';
  import Tabs from '../lib/Tabs.svelte';
  import Timeline from '../lib/Timeline.svelte';
  import TopBar from '../lib/TopBar.svelte';
  import { formatDate, t } from '../i18n/index.svelte.js';
  import { customer, resolvedEvent, staff, task } from '../lib/mock.js';

  // role: owner | collaborator | reader (Staff not on this Task) | taskmaster
  let { status = 'in_progress', role = 'owner' } = $props();

  let filter = $state('all');
  const filters = $derived([
    { id: 'all', label: t('filter.all') },
    { id: 'comments', label: t('filter.comments') },
    { id: 'events', label: t('filter.events') },
    { id: 'threads', label: t('filter.threads'), count: 2 },
  ]);
  const matches = {
    comments: (e) => e.kind === 'comment',
    events: (e) => e.kind === 'event' || e.kind === 'deleted',
    threads: (e) => e.threads?.length,
  };

  const canWrite = $derived(role !== 'reader');
  const canClose = $derived(role === 'owner' || role === 'taskmaster');
  const isMaster = $derived(role === 'taskmaster');
  const all = $derived(status === 'resolved' ? [...task.timeline, resolvedEvent] : task.timeline);
  const entries = $derived(filter === 'all' ? all : all.filter(matches[filter]));
  const viewer = $derived(
    { owner: staff.owner, collaborator: staff.nicha, reader: 'Arthit Boonmee', taskmaster: staff.master }[role],
  );
  const due = $derived(formatDate(task.due, { day: 'numeric', month: 'short', year: 'numeric' }));
</script>

<div class="app">
  <TopBar active="tasks" user={viewer} />

  <div class="tabstrip">
    <span class="doctab active">{task.id} {task.title}<Icon name="x" size={14} /></span>
    <span class="doctab">#1038 Fax images arrive solid black</span>
    <button class="newtab">{t('common.newTask')} <Icon name="plus" size={16} /></button>
  </div>

  <div class="sheet">
    <header class="summary">
      <div class="who">
        <Avatar name={task.organization} size={44} />
        <div>
          <strong>{task.organization}</strong>
          <span>{t('task.customerOf', { name: customer.name })}</span>
        </div>
      </div>
      <div class="meta"><span class="k">{t('task.due')}</span><span>{due}</span></div>
      <div class="meta"><Badge {status} /><span>{t('task.number', { id: task.id })}</span></div>

      <!-- One slot, by what the viewer may do: close the Task, or be told they cannot. -->
      <div class="actions">
        {#if !canWrite}
          <Badge tone="slate" label={t('task.readOnly')} dot={false} />
        {:else if status === 'resolved'}
          {#if isMaster}
            <Button icon="reopen" label={t('task.reopen')} />
            <Button variant="primary" icon="checkCircle" label={t('task.confirmDone')} />
          {:else}
            <Badge tone="amber" label={t('task.waitingCustomer')} />
          {/if}
        {:else if canClose}
          <Button variant="danger" icon="ban" label={t('task.cancel')} />
          <Button variant="primary" icon="checkCircle" label={t('task.markResolved')} />
        {/if}
      </div>
    </header>

    {#if status === 'resolved'}
      <p class="banner">
        <Icon name="clock" size={16} />
        <span
          ><strong>{t('task.awaitingTitle')}</strong>
          {t('task.awaitingBody', { name: customer.name, hours: 31 })}</span
        >
      </p>
    {/if}

    <div class="cols">
      <aside class="people">
        <section>
          <h3>
            {t('task.owner')}
            {#if isMaster}<button class="act" aria-label={t('task.reassignOwner')}><Icon name="swap" size={14} />{t('task.reassign')}</button>{/if}
          </h3>
          <div class="person"><Avatar name={staff.owner} size={32} /><span>{staff.owner}</span></div>
        </section>
        <section>
          <h3>
            {t('task.collaborators')}
            {#if canClose}<button class="act" aria-label={t('task.addCollaborator')}><Icon name="plus" size={14} />{t('common.add')}</button>{/if}
          </h3>
          {#each task.collaborators as name (name)}
            <div class="person"><Avatar {name} size={32} /><span>{name}</span></div>
          {/each}
        </section>
        <section>
          <h3>{t('task.customer')}</h3>
          <div class="person">
            <Avatar name={customer.name} size={32} />
            <span>{customer.name}<small>{customer.email}</small></span>
          </div>
        </section>
        <Field label={t('task.organization')} type="select" options={[task.organization]} icon="building" />
        <Field label={t('task.dueDate')} value={due} icon="calendar" />
        <section>
          <h3>
            {t('task.related')}
            {#if canWrite}<button class="act" aria-label={t('task.newRelated')}><Icon name="plus" size={14} />{t('common.newTask')}</button>{/if}
          </h3>
          <a class="ref" href="#ref"><Icon name="link" size={15} />{task.refersTo}</a>
        </section>
      </aside>

      <main class="center">
        <div class="titlebar">
          <h1>{task.title}</h1>
          <span class="via">{t('task.openedBy', { name: staff.owner })}</span>
        </div>
        <div class="tools">
          <h2><Icon name="activity" size={18} /> {t('timeline.title')}</h2>
          <Tabs items={filters} bind:active={filter} />
        </div>
        <div class="scroll">
          <Timeline {entries} actions={canWrite} />
        </div>
        <div class="dock">
          <Composer disabled={!canWrite} disabledReason={t('composer.locked')} />
        </div>
      </main>
    </div>
  </div>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    min-height: 640px;
    background: var(--c-bg);
  }
  .tabstrip {
    display: flex;
    align-items: flex-end;
    gap: 4px;
    padding: var(--s-4) var(--s-6) 0;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .doctab {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    height: 44px;
    padding: 0 16px;
    border: 1px solid transparent;
    border-bottom: 0;
    border-radius: var(--r-md) var(--r-md) 0 0;
    color: var(--c-text-3);
    white-space: nowrap;
  }
  .doctab.active {
    background: var(--c-surface);
    border-color: var(--c-border);
    color: var(--c-text);
    font-weight: 500;
  }
  .newtab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 44px;
    padding: 0 14px;
    border: 0;
    background: none;
    color: var(--c-primary-text);
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
  }
  .sheet {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    margin: 0 var(--s-6) var(--s-6);
    border: 1px solid var(--c-border);
    border-radius: 0 var(--r-lg) var(--r-lg) var(--r-lg);
    background: var(--c-surface);
    overflow: hidden;
  }

  .summary {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--s-3) var(--s-6);
    padding: var(--s-4) var(--s-5);
    border-bottom: 1px solid var(--c-border);
  }
  .who {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .who div,
  .meta {
    display: grid;
    gap: 2px;
  }
  .who span,
  .meta span:last-child,
  .k {
    color: var(--c-text-3);
    font-size: var(--fs-sm);
  }
  .meta {
    padding-left: var(--s-6);
    border-left: 1px solid var(--c-border);
    justify-items: start;
  }
  .meta .k + span {
    color: var(--c-text);
    font-size: var(--fs-md);
    font-weight: 500;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    margin-left: auto;
  }
  .banner {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    padding: 10px var(--s-5);
    background: var(--c-amber-bg);
    color: var(--c-amber-fg);
  }

  .cols {
    flex: 1;
    display: grid;
    grid-template-columns: 280px minmax(0, 1fr);
    min-height: 0;
  }
  .people {
    display: flex;
    flex-direction: column;
    gap: var(--s-5);
    padding: var(--s-5);
    border-right: 1px solid var(--c-border);
    overflow-y: auto;
  }
  h3 {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 26px;
    margin: 0 0 6px;
    font-size: var(--fs-sm);
    font-weight: 600;
  }
  /* The action for a section sits on the same line as its title, at the far right. */
  .act {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 26px;
    padding: 0 8px;
    border: 0;
    border-radius: 7px;
    background: var(--c-primary-soft);
    color: var(--c-primary-text);
    font-size: var(--fs-xs);
    font-weight: 600;
    cursor: pointer;
  }
  .act:hover {
    box-shadow: inset 0 0 0 1px var(--c-primary-border);
  }
  .person {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 0;
  }
  .person span {
    flex: 1;
    min-width: 0;
    font-weight: 500;
  }
  .person small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--c-text-3);
    font-size: var(--fs-xs);
    font-weight: 400;
  }
  .ref {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--c-primary-text);
    text-decoration: none;
  }

  .center {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }
  .titlebar {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px 12px;
    padding: var(--s-4) var(--s-5);
    border-bottom: 1px solid var(--c-border);
  }
  h1 {
    margin: 0;
    font-size: var(--fs-lg);
    font-weight: 600;
  }
  .via {
    color: var(--c-text-3);
    font-size: var(--fs-sm);
  }
  .tools {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--s-3);
    padding: var(--s-3) var(--s-5);
    border-bottom: 1px solid var(--c-border);
  }
  h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: var(--fs-lg);
    font-weight: 600;
  }
  .scroll {
    flex: 1;
    overflow-y: auto;
    padding: var(--s-6) var(--s-5) 0;
  }
  .dock {
    padding: var(--s-3) var(--s-5) var(--s-5);
  }

  @media (max-width: 800px) {
    .app {
      height: auto;
    }
    .cols {
      grid-template-columns: minmax(0, 1fr);
    }
    .people {
      border-right: 0;
      border-bottom: 1px solid var(--c-border);
    }
    .sheet,
    .tabstrip {
      margin-inline: var(--s-3);
      padding-inline: 0;
    }
    .meta {
      padding-left: 0;
      border-left: 0;
    }
  }
</style>
