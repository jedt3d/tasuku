<script>
  // PROTOTYPE: everything that has happened for one Organization. Mock data only.
  import ActivityScatter from '../lib/ActivityScatter.svelte';
  import Avatar from '../lib/Avatar.svelte';
  import Badge from '../lib/Badge.svelte';
  import Button from '../lib/Button.svelte';
  import Icon from '../lib/Icon.svelte';
  import SlideOver from '../lib/SlideOver.svelte';
  import Timeline from '../lib/Timeline.svelte';
  import TopBar from '../lib/TopBar.svelte';
  import { formatDate, relative, t } from '../i18n/index.svelte.js';
  import { activityLegend, activityRange, lannaActivity, orgStats, orgTasks, task } from '../lib/mock.js';

  let { peek = false, selectedPoint = 'Lanna Medical Group/Dr. Ploy Suwan/10' } = $props();

  let selected = $state(selectedPoint);
  let peeked = $state(peek ? orgTasks[0] : null);
  // A dot belongs to a Task; open that Task in the side panel.
  const peekAt = (dot) => (peeked = orgTasks.find((row) => dot.title.startsWith(row.id)) ?? orgTasks[0]);

  const when = (updated) =>
    updated.ago
      ? relative(...updated.ago)
      : updated.date
        ? formatDate(updated.date)
        : t('organization.closesIn', { hours: updated.closesIn });
</script>

<div class="app">
  <TopBar active="organizations" />

  <main>
    <nav class="crumbs">
      <a href="#overview">{t('nav.overview')}</a><Icon name="chevronRight" size={14} /><span>{task.organization}</span>
    </nav>

    <header class="hero">
      <Avatar name={task.organization} size={52} />
      <div class="htext">
        <h1>{task.organization}</h1>
        <p>
          {t('organization.summary', {
            customers: 3,
            when: formatDate('2025-03-01', { month: 'long', year: 'numeric' }),
          })}
        </p>
      </div>
      <Button variant="primary" icon="plus" label={t('common.newTask')} />
    </header>

    <div class="stats">
      {#each orgStats as stat (stat.key)}
        <div class="stat">
          <span class="num">{stat.value}</span>
          <Badge tone={stat.tone} label={t(stat.key)} />
        </div>
      {/each}
    </div>

    <ActivityScatter
      title={t('organization.activity')}
      groups={[lannaActivity]}
      legend={activityLegend}
      expanded={[lannaActivity.name]}
      {...activityRange}
      bind:selected
      onpeek={peekAt}
      onopen={peekAt}
    />

    <section class="panel">
      <header><h2>{t('organization.tasks')}</h2><span class="count">{orgTasks.length}</span></header>
      <ul>
        {#each orgTasks as row (row.id)}
          <li>
            <button class="row" class:on={peeked?.id === row.id} onclick={() => (peeked = row)}>
              <span class="id">{row.id}</span>
              <span class="title">{row.title}</span>
              <Badge status={row.status} />
              <span class="owner"><Avatar name={row.owner} size={24} />{row.owner}</span>
              <span class="updated">{when(row.updated)}</span>
              <Icon name="chevronRight" size={16} />
            </button>
          </li>
        {/each}
      </ul>
    </section>
  </main>

  {#if peeked}
    <SlideOver
      width={520}
      title="{peeked.id} {peeked.title}"
      subtitle={t('organization.people', { owner: peeked.owner, customer: peeked.customer })}
      onclose={() => (peeked = null)}
    >
      <div class="peekmeta">
        <Badge status={peeked.status} /><span>{t('organization.updated', { when: when(peeked.updated) })}</span>
      </div>
      <Timeline entries={task.timeline.slice(0, 6)} />
      {#snippet footer()}
        <Button label={t('common.close')} onclick={() => (peeked = null)} />
        <Button variant="primary" iconRight="arrowUpRight" label={t('organization.openFull')} />
      {/snippet}
    </SlideOver>
  {/if}
</div>

<style>
  .app {
    min-height: 100vh;
    background: var(--c-bg);
  }
  main {
    display: grid;
    gap: var(--s-5);
    max-width: 1180px;
    margin: 0 auto;
    padding: var(--s-5) var(--s-6) var(--s-8);
  }
  .crumbs {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--c-text-3);
    font-size: var(--fs-sm);
  }
  .crumbs a {
    color: var(--c-primary-text);
    text-decoration: none;
  }
  .hero {
    display: flex;
    align-items: center;
    gap: var(--s-4);
  }
  .htext {
    flex: 1;
    min-width: 0;
  }
  h1 {
    margin: 0;
    font-size: var(--fs-2xl);
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .hero p {
    margin: 0;
    color: var(--c-text-3);
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: var(--s-3);
  }
  .stat {
    display: grid;
    gap: 6px;
    justify-items: start;
    padding: var(--s-4) var(--s-5);
    border: 1px solid var(--c-border);
    border-radius: var(--r-lg);
    background: var(--c-surface);
  }
  .num {
    font-size: var(--fs-2xl);
    font-weight: 700;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }

  .panel {
    border: 1px solid var(--c-border);
    border-radius: var(--r-lg);
    background: var(--c-surface);
    overflow: hidden;
  }
  .panel header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: var(--s-4) var(--s-5);
    border-bottom: 1px solid var(--c-border);
  }
  h2 {
    margin: 0;
    font-size: var(--fs-lg);
    font-weight: 600;
  }
  .count {
    padding: 0 8px;
    border-radius: var(--r-pill);
    background: var(--c-slate-bg);
    color: var(--c-slate-fg);
    font-size: var(--fs-xs);
    font-weight: 600;
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li + li {
    border-top: 1px solid var(--c-border);
  }
  .row {
    display: grid;
    grid-template-columns: 56px minmax(0, 1fr) auto 170px 190px 16px;
    align-items: center;
    gap: var(--s-4);
    width: 100%;
    padding: 12px var(--s-5);
    border: 0;
    background: none;
    text-align: left;
    color: var(--c-text-3);
    cursor: pointer;
  }
  .row:hover,
  .row.on {
    background: var(--c-surface-2);
  }
  .row.on {
    box-shadow: inset 3px 0 0 var(--c-primary);
  }
  .id {
    font-variant-numeric: tabular-nums;
  }
  .title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--c-text);
    font-weight: 500;
  }
  .owner {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--c-text-2);
  }
  .updated {
    font-size: var(--fs-sm);
    text-align: right;
  }
  .peekmeta {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: var(--s-5);
    color: var(--c-text-3);
    font-size: var(--fs-sm);
  }

  @media (max-width: 900px) {
    .row {
      grid-template-columns: 56px minmax(0, 1fr) auto 16px;
    }
    .owner,
    .updated {
      display: none;
    }
    main {
      padding-inline: var(--s-3);
    }
  }
</style>
