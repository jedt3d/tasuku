<script>
  // The Staff landing page: every Task, by status, and the ones the reader owns. The layout follows
  // the Overview prototype in the design system; its Organization and Activity views, and search,
  // have nothing to show until Organizations (#7) and the Timeline (#5) exist.
  import Badge from '@ui/lib/Badge.svelte';
  import Button from '@ui/lib/Button.svelte';
  import Field from '@ui/lib/Field.svelte';
  import Icon from '@ui/lib/Icon.svelte';
  import SlideOver from '@ui/lib/SlideOver.svelte';
  import Tabs from '@ui/lib/Tabs.svelte';
  import { formatDate, t } from '@ui/i18n/index.svelte.js';
  import { auth, displayName } from '#lib/session.svelte.js';
  import { supabase } from '#lib/supabase.js';

  const blank = { title: '', description: '', due_date: '' };

  let status = $state('all');
  let view = $state('all');
  let tasks = $state([]);
  let problem = $state(''); // a message key, or '' when there is nothing to report
  let panel = $state(false);
  let draft = $state({ ...blank });
  let busy = $state(false);

  const statuses = $derived(
    ['all', 'open', 'in_progress', 'resolved', 'done', 'cancelled'].map((id) => ({
      id,
      label: id === 'all' ? t('filter.allTasks') : t(`status.${id}`),
    })),
  );
  const views = $derived([
    { id: 'organizations', label: t('overview.byOrganization') },
    { id: 'activity', label: t('overview.activity') },
    { id: 'all', label: t('filter.allTasks') },
    { id: 'mine', label: t('overview.myTasks') },
  ]);
  const listed = $derived(view === 'all' || view === 'mine');
  const complete = $derived(Boolean(draft.title.trim() && draft.description.trim()));

  let asked = 0;
  async function refresh() {
    const request = ++asked;
    // ponytail: one page. The API returns at most 1000 rows (supabase/config.toml), newest first;
    // page the list when Tasuku holds more Tasks than that.
    let query = supabase
      .from('tasks')
      .select('id, title, status, due_date, owner:staff(name, email)')
      .order('id', { ascending: false });
    if (status !== 'all') query = query.eq('status', status);
    if (view === 'mine') query = query.eq('owner_id', auth.userId);
    const { data, error } = await query;
    if (request !== asked) return; // a later choice of filter has already asked again
    problem = error ? 'common.error' : '';
    tasks = data ?? [];
  }

  async function openTask() {
    busy = true;
    const { error } = await supabase.from('tasks').insert({
      title: draft.title.trim(),
      description: draft.description.trim(),
      due_date: draft.due_date || null,
    });
    busy = false;
    if (error) {
      problem = 'common.error';
      return;
    }
    panel = false;
    draft = { ...blank };
    await refresh();
  }

  $effect(() => {
    if (listed) refresh();
  });
</script>

<div class="toolbar">
  <Tabs items={statuses} bind:active={status} />
  <label class="search">
    <Icon name="search" size={17} />
    <input placeholder={t('overview.search')} disabled />
  </label>
  <Button variant="primary" icon="plus" label={t('common.newTask')} onclick={() => (panel = true)} />
</div>

<div class="views"><Tabs variant="underline" items={views} bind:active={view} /></div>

<main>
  {#if problem}<p class="error" role="alert">{t(problem)}</p>{/if}
  <section class="panel">
    <header><h1>{views.find((v) => v.id === view).label}</h1></header>
    {#if listed && tasks.length}
      <ul>
        {#each tasks as task (task.id)}
          <li>
            <a href="/tasks/{task.id}">
              <span class="number">#{task.id}</span>
              <span class="title">{task.title}</span>
              <Badge status={task.status} />
              <span class="meta">{displayName(task.owner)}</span>
              {#if task.due_date}<span class="meta">{t('task.due')} {formatDate(task.due_date)}</span>{/if}
            </a>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="empty">{t('home.empty')}</p>
    {/if}
  </section>
</main>

<SlideOver open={panel} title={t('common.newTask')} subtitle={t('new.subtitle')} onclose={() => (panel = false)}>
  <div class="form">
    <Field label={t('new.title')} placeholder={t('new.titlePh')} bind:value={draft.title} />
    <Field
      label={t('new.description')}
      type="textarea"
      placeholder={t('new.descriptionPh')}
      bind:value={draft.description}
    />
    <Field label={t('task.dueDate')} type="date" action={t('common.optional')} bind:value={draft.due_date} />
    {#if problem}<p class="error" role="alert">{t(problem)}</p>{/if}
  </div>
  {#snippet footer()}
    <Button label={t('common.cancel')} onclick={() => (panel = false)} />
    <Button variant="primary" label={t('new.submit')} disabled={busy || !complete} onclick={openTask} />
  {/snippet}
</SlideOver>

<style>
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
    flex: 1;
    display: grid;
    gap: var(--s-3);
    align-content: start;
    padding: var(--s-5) var(--s-6) var(--s-8);
  }
  .panel {
    border: 1px solid var(--c-border);
    border-radius: var(--r-lg);
    background: var(--c-surface);
  }
  .panel header {
    padding: var(--s-4) var(--s-5);
    border-bottom: 1px solid var(--c-border);
  }
  h1 {
    margin: 0;
    font-size: var(--fs-lg);
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
  li a {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-2) var(--s-4);
    padding: var(--s-3) var(--s-5);
    color: var(--c-text);
    text-decoration: none;
  }
  li a:hover {
    background: var(--c-surface-2);
  }
  .number,
  .meta {
    color: var(--c-text-3);
    font-size: var(--fs-sm);
  }
  .title {
    flex: 1;
    min-width: 12ch;
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  .empty,
  .error {
    margin: 0;
    padding: var(--s-5);
    color: var(--c-text-3);
  }
  .error {
    padding: 0;
    color: var(--c-red-fg);
  }
  .form {
    display: grid;
    gap: var(--s-5);
  }

  @media (max-width: 520px) {
    main,
    .toolbar,
    .views {
      padding-inline: var(--s-3);
    }
  }
</style>
