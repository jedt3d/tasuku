<script>
  // PROTOTYPE: the Staff view of one Task. Mock data only, nothing is saved.
  import Avatar from '../lib/Avatar.svelte';
  import Badge from '../lib/Badge.svelte';
  import Button from '../lib/Button.svelte';
  import Composer from '../lib/Composer.svelte';
  import Field from '../lib/Field.svelte';
  import Icon from '../lib/Icon.svelte';
  import QuickAction from '../lib/QuickAction.svelte';
  import Tabs from '../lib/Tabs.svelte';
  import Timeline from '../lib/Timeline.svelte';
  import TopBar from '../lib/TopBar.svelte';
  import { customer, resolvedEvent, staff, task } from '../lib/mock.js';

  // role: owner | collaborator | reader (Staff not on this Task) | taskmaster
  let { status = 'in_progress', role = 'owner' } = $props();

  let filter = $state('all');
  const filters = [
    { id: 'all', label: 'All' },
    { id: 'comments', label: 'Comments' },
    { id: 'events', label: 'Events' },
    { id: 'threads', label: 'Threads', count: 2 },
  ];
  const kinds = { comments: ['comment'], events: ['event', 'deleted'], threads: ['thread'] };

  const canWrite = $derived(role !== 'reader');
  const canClose = $derived(role === 'owner' || role === 'taskmaster');
  const isMaster = $derived(role === 'taskmaster');
  const all = $derived(status === 'resolved' ? [...task.timeline, resolvedEvent] : task.timeline);
  const entries = $derived(filter === 'all' ? all : all.filter((e) => kinds[filter].includes(e.kind)));
  const viewer = $derived({ owner: staff.owner, collaborator: staff.nicha, reader: 'Arthit Boonmee', taskmaster: staff.master }[role]);
</script>

<div class="app">
  <TopBar active="tasks" user={viewer} />

  <div class="tabstrip">
    <span class="doctab active">{task.id} {task.title}<Icon name="x" size={14} /></span>
    <span class="doctab">#1038 Fax images arrive solid black</span>
    <button class="newtab">New Task <Icon name="plus" size={16} /></button>
  </div>

  <div class="sheet">
    <header class="summary">
      <div class="who">
        <Avatar name={task.organization} size={44} />
        <div>
          <strong>{task.organization}</strong>
          <span>Customer · {customer.name}</span>
        </div>
      </div>
      <div class="meta"><span class="k">Due</span><span>{task.due}</span></div>
      <div class="meta"><Badge {status} /><span>Task {task.id}</span></div>
      <div class="actions">
        {#if !canWrite}
          <Badge tone="slate" label="Read-only · you are not on this Task" dot={false} />
        {:else if status === 'resolved'}
          {#if isMaster}
            <Button icon="reopen" label="Reopen" />
            <Button variant="primary" icon="checkCircle" label="Confirm Done" />
          {:else}
            <Badge tone="amber" label="Waiting for the Customer" />
          {/if}
        {:else}
          <Button variant="primary" icon="checkCircle" label="Mark Resolved" disabled={!canClose} />
        {/if}
      </div>
    </header>

    {#if status === 'resolved'}
      <p class="banner">
        <Icon name="clock" size={16} />
        <span
          ><strong>Awaiting the Customer's confirmation.</strong> {customer.name} can mark this Done or
          Reopen it. Closes automatically in 31 h.</span
        >
      </p>
    {/if}

    <div class="cols">
      <aside class="people">
        <section>
          <h3>Owner</h3>
          <div class="person">
            <Avatar name={staff.owner} size={32} />
            <span>{staff.owner}</span>
            {#if isMaster}<button class="link">Reassign</button>{/if}
          </div>
        </section>
        <section>
          <h3>Collaborators {#if canClose}<button class="link">+ Add</button>{/if}</h3>
          {#each task.collaborators as name (name)}
            <div class="person"><Avatar {name} size={32} /><span>{name}</span></div>
          {/each}
        </section>
        <section>
          <h3>Customer {#if canWrite}<button class="link">Change</button>{/if}</h3>
          <div class="person">
            <Avatar name={customer.name} size={32} />
            <span>{customer.name}<small>{customer.email}</small></span>
          </div>
        </section>
        <Field label="Organization" type="select" options={[task.organization]} icon="building" />
        <Field label="Due date" value={task.due} icon="calendar" />
        <section>
          <h3>Refers to</h3>
          <a class="ref" href="#ref"><Icon name="link" size={15} />{task.refersTo}</a>
        </section>
      </aside>

      <main class="center">
        <div class="titlebar">
          <h1>{task.title}</h1>
          <span class="via">Opened by {staff.owner}</span>
        </div>
        <div class="tools">
          <h2><Icon name="activity" size={18} /> Timeline</h2>
          <Tabs items={filters} bind:active={filter} />
        </div>
        <div class="scroll">
          <Timeline {entries} />
        </div>
        <div class="dock">
          <Composer
            disabled={!canWrite}
            disabledReason="Only the Owner and Collaborators can comment on this Task."
            targets={[
              { id: 'timeline', label: 'Timeline · Customer sees this' },
              { id: 'thread', label: 'Thread · Staff only' },
            ]}
          />
        </div>
      </main>

      <aside class="quick">
        <h2>Quick actions</h2>
        <section>
          <h3>People</h3>
          <div class="tiles">
            <QuickAction icon="userPlus" label="Add Collaborator" disabled={!canClose} />
            <QuickAction icon="mail" label="Change Customer" disabled={!canWrite} />
            <QuickAction icon="swap" label="Reassign Owner" disabled={!isMaster} />
          </div>
        </section>
        <section>
          <h3>Timeline</h3>
          <div class="tiles">
            <QuickAction icon="paperclip" label="Attach file" disabled={!canWrite} />
            <QuickAction icon="thread" label="New Thread" disabled={!canWrite} />
          </div>
        </section>
        <section>
          <h3>Status</h3>
          <div class="tiles">
            <QuickAction icon="checkCircle" label="Mark Resolved" disabled={!canClose || status === 'resolved'} />
            <QuickAction icon="ban" label="Cancel Task" tone="danger" disabled={!canClose || status === 'resolved'} />
          </div>
        </section>
        <section>
          <h3>Related</h3>
          <div class="tiles">
            <QuickAction icon="link" label="New Task from this" />
          </div>
        </section>
      </aside>
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
    color: var(--c-primary-hover);
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
    grid-template-columns: 264px minmax(0, 1fr) 300px;
    min-height: 0;
  }
  .people,
  .quick {
    display: flex;
    flex-direction: column;
    gap: var(--s-5);
    padding: var(--s-5);
    overflow-y: auto;
  }
  .people {
    border-right: 1px solid var(--c-border);
  }
  .quick {
    border-left: 1px solid var(--c-border);
  }
  h3 {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 0 0 8px;
    font-size: var(--fs-sm);
    font-weight: 600;
  }
  .link {
    padding: 0;
    border: 0;
    background: none;
    color: var(--c-primary-hover);
    font-size: var(--fs-sm);
    font-weight: 500;
    cursor: pointer;
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
    color: var(--c-primary-hover);
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

  .quick section + section {
    padding-top: var(--s-5);
    border-top: 1px solid var(--c-border);
  }
  .tiles {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 8px;
  }

  @media (max-width: 1180px) {
    .cols {
      grid-template-columns: 240px minmax(0, 1fr);
    }
    .quick {
      display: none;
    }
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
