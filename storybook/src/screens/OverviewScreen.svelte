<script>
  // PROTOTYPE: the Staff landing page, summarising work per Organization. Mock data only.
  import ActivityScatter from '../lib/ActivityScatter.svelte';
  import Button from '../lib/Button.svelte';
  import Field from '../lib/Field.svelte';
  import Icon from '../lib/Icon.svelte';
  import OrgCard from '../lib/OrgCard.svelte';
  import SlideOver from '../lib/SlideOver.svelte';
  import Tabs from '../lib/Tabs.svelte';
  import TopBar from '../lib/TopBar.svelte';
  import { relative, t } from '../i18n/index.svelte.js';
  import { activityLegend, activityRange, allActivity, organizations, statusCounts } from '../lib/mock.js';

  let { newTask = false, initialView = 'organizations' } = $props();

  let panel = $state(newTask);
  let status = $state('all');
  let view = $state(initialView);
  let layout = $state('grid');

  const statuses = $derived(
    statusCounts.map((s) => ({ ...s, label: s.id === 'all' ? t('filter.allTasks') : t(`status.${s.id}`) })),
  );
  const views = $derived([
    { id: 'organizations', label: t('overview.byOrganization') },
    { id: 'activity', label: t('overview.activity') },
    { id: 'all', label: t('filter.allTasks') },
    { id: 'mine', label: t('overview.myTasks'), count: 5 },
  ]);
  // Cards receive finished text: the mock carries keys and numbers, the screen localises them.
  const cards = $derived(
    organizations.map((org) => ({
      name: org.name,
      internal: org.internal,
      value: org.value,
      unit: t('org.open'),
      badge: { tone: org.badge.tone, label: t(org.badge.key, { n: org.badge.n }) },
      latest: `${org.latest} · ${relative(...org.ago)}`,
      meta: t(org.meta.key, { n: org.meta.n }),
    })),
  );
</script>

<div class="app">
  <TopBar active="overview" />

  <div class="toolbar">
    <Tabs items={statuses} bind:active={status} />
    <label class="search">
      <Icon name="search" size={17} />
      <input placeholder={t('overview.search')} />
    </label>
    <Button variant="primary" icon="plus" label={t('common.newTask')} onclick={() => (panel = true)} />
  </div>

  <div class="views"><Tabs variant="underline" items={views} bind:active={view} /></div>

  <main>
    {#if view === 'activity'}
      <ActivityScatter
        title={t('overview.activityTitle')}
        groups={allActivity}
        legend={activityLegend}
        expanded={['Lanna Medical Group']}
        {...activityRange}
      />
    {:else}
      <section class="panel">
        <header>
          <h1>{t('overview.organizations')}</h1>
          <div class="controls">
            <Button label={t('overview.counting')} iconRight="chevronDown" />
            <Button label={t('overview.sort')} iconRight="chevronDown" />
            <div class="toggle" role="group" aria-label={t('overview.layout')}>
              <button class:active={layout === 'grid'} aria-label={t('overview.grid')} onclick={() => (layout = 'grid')}
                ><Icon name="grid" size={17} /></button
              >
              <button class:active={layout === 'list'} aria-label={t('overview.list')} onclick={() => (layout = 'list')}
                ><Icon name="list" size={17} /></button
              >
            </div>
          </div>
        </header>
        <div class="cards" class:list={layout === 'list'}>
          {#each cards as card (card.name)}
            <OrgCard {...card} />
          {/each}
        </div>
      </section>
    {/if}
  </main>

  <SlideOver open={panel} title={t('common.newTask')} subtitle={t('new.subtitle')} onclose={() => (panel = false)}>
    <div class="form">
      <Field label={t('new.title')} placeholder={t('new.titlePh')} />
      <Field label={t('new.description')} type="textarea" placeholder={t('new.descriptionPh')} />
      <Field
        label={t('task.organization')}
        type="select"
        icon="building"
        options={[t('new.orgNone'), ...organizations.filter((o) => !o.internal).map((o) => o.name)]}
        hint={t('new.orgHint')}
      />
      <Field
        label={t('new.customerEmail')}
        type="email"
        icon="mail"
        placeholder="name@example.com"
        action={t('common.optional')}
        hint={t('new.customerHint')}
      />
      <Field label={t('task.dueDate')} type="date" action={t('common.optional')} />
    </div>
    {#snippet footer()}
      <Button label={t('common.cancel')} onclick={() => (panel = false)} />
      <Button variant="primary" label={t('new.submit')} />
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
