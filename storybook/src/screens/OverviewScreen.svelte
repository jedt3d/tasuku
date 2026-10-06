<script>
  // PROTOTYPE: the Staff landing page, summarising work per Organization. Mock data only.
  import Button from '../lib/Button.svelte';
  import Field from '../lib/Field.svelte';
  import Icon from '../lib/Icon.svelte';
  import OrgCard from '../lib/OrgCard.svelte';
  import SlideOver from '../lib/SlideOver.svelte';
  import Tabs from '../lib/Tabs.svelte';
  import TopBar from '../lib/TopBar.svelte';
  import { organizations, statusCounts } from '../lib/mock.js';

  let { newTask = false } = $props();

  let panel = $state(newTask);
  let status = $state('all');
  let view = $state('organizations');
  let layout = $state('grid');
  const views = [
    { id: 'organizations', label: 'By Organization' },
    { id: 'all', label: 'All Tasks' },
    { id: 'mine', label: 'My Tasks', count: 5 },
  ];
</script>

<div class="app">
  <TopBar active="overview" />

  <div class="toolbar">
    <Tabs items={statusCounts} bind:active={status} />
    <label class="search">
      <Icon name="search" size={17} />
      <input placeholder="Search Tasks…" />
    </label>
    <Button variant="primary" icon="plus" label="New Task" onclick={() => (panel = true)} />
  </div>

  <div class="views"><Tabs variant="underline" items={views} bind:active={view} /></div>

  <main>
    <section class="panel">
      <header>
        <h1>Organizations</h1>
        <div class="controls">
          <Button label="Counting: Open Tasks" iconRight="chevronDown" />
          <Button label="Sort by: Last change" iconRight="chevronDown" />
          <div class="toggle" role="group" aria-label="Layout">
            <button class:active={layout === 'grid'} aria-label="Grid" onclick={() => (layout = 'grid')}
              ><Icon name="grid" size={17} /></button
            >
            <button class:active={layout === 'list'} aria-label="List" onclick={() => (layout = 'list')}
              ><Icon name="list" size={17} /></button
            >
          </div>
        </div>
      </header>
      <div class="cards" class:list={layout === 'list'}>
        {#each organizations as org (org.name)}
          <OrgCard {...org} />
        {/each}
      </div>
    </section>
  </main>

  <SlideOver
    open={panel}
    title="New Task"
    subtitle="You become the Owner. It starts as Open."
    onclose={() => (panel = false)}
  >
    <div class="form">
      <Field label="Title" placeholder="What needs to be done?" />
      <Field label="Description" type="textarea" placeholder="Context, steps, anything the next person needs." />
      <Field
        label="Organization"
        type="select"
        icon="building"
        options={['No Organization (internal)', ...organizations.filter((o) => !o.internal).map((o) => o.name)]}
        hint="Optional. A label for grouping; it grants no access."
      />
      <Field
        label="Customer email"
        type="email"
        icon="mail"
        placeholder="name@example.com"
        action="Optional"
        hint="One Customer per Task. They get a magic link to this Task only."
      />
      <Field label="Due date" type="date" action="Optional" />
    </div>
    {#snippet footer()}
      <Button label="Cancel" onclick={() => (panel = false)} />
      <Button variant="primary" label="Open Task" />
    {/snippet}
  </SlideOver>
</div>

<style>
  .app {
    min-height: 100vh;
    background: var(--c-bg);
  }
  .toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--s-3);
    padding: var(--s-3) var(--s-6);
    background: var(--c-surface);
    border-bottom: 1px solid var(--c-border);
  }
  .search {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 180px;
    max-width: 340px;
    height: 40px;
    margin-left: auto;
    padding: 0 12px;
    border: 1px solid var(--c-border-strong);
    border-radius: var(--r-md);
    color: var(--c-text-3);
  }
  .search input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    background: none;
  }
  .views {
    padding: 0 var(--s-6);
    background: var(--c-surface);
  }
  main {
    padding: var(--s-5) var(--s-6) var(--s-8);
  }
  .panel {
    border: 1px solid var(--c-border);
    border-radius: var(--r-lg);
    background: var(--c-surface);
  }
  .panel header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--s-3);
    padding: var(--s-4) var(--s-5);
    border-bottom: 1px solid var(--c-border);
  }
  h1 {
    margin: 0;
    font-size: var(--fs-lg);
    font-weight: 600;
  }
  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-2);
  }
  .toggle {
    display: flex;
    gap: 4px;
  }
  .toggle button {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border: 1px solid var(--c-border-strong);
    border-radius: var(--r-md);
    background: var(--c-surface);
    color: var(--c-text-2);
    cursor: pointer;
  }
  .toggle button.active {
    border-color: var(--c-primary);
    color: var(--c-primary);
    background: var(--c-primary-soft);
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
    gap: var(--s-4);
    padding: var(--s-5);
  }
  .cards.list {
    grid-template-columns: 1fr;
    gap: var(--s-2);
  }
  .form {
    display: grid;
    gap: var(--s-5);
  }

  @media (max-width: 520px) {
    .cards {
      grid-template-columns: 1fr;
      padding: var(--s-3);
    }
    main,
    .toolbar,
    .views {
      padding-inline: var(--s-3);
    }
  }
</style>
