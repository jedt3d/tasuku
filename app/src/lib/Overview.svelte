<script>
  // The Staff landing page: every Task, by status, the ones the reader is part of, and the ones of
  // one Organization. The layout follows the Overview prototype in the design system; its
  // Organization cards, its Activity view and search are not built yet.
  import Badge from '@ui/lib/Badge.svelte';
  import Button from '@ui/lib/Button.svelte';
  import Field from '@ui/lib/Field.svelte';
  import Icon from '@ui/lib/Icon.svelte';
  import SlideOver from '@ui/lib/SlideOver.svelte';
  import Tabs from '@ui/lib/Tabs.svelte';
  import { formatDate, t } from '@ui/i18n/index.svelte.js';
  import { page } from '$app/state';
  import { auth, displayName } from '#lib/session.svelte.js';
  import { supabase } from '#lib/supabase.js';

  const blank = { title: '', description: '', due_date: '', organization_id: '', earlier_task_id: '' };
  // "New Task that refers to this one" on a Task leads here with the number of that Task.
  const earlier = page.url.searchParams.get('earlier') ?? '';

  let status = $state('all');
  let view = $state('all');
  let tasks = $state([]);
  let problem = $state(''); // a message key, or '' when there is nothing to report
  let panel = $state(Boolean(earlier));
  let draft = $state({ ...blank, earlier_task_id: earlier });
  let busy = $state(false);
  let organizations = $state([]); // every Organization, by name
  // The count next to a Staff member on the Staff page leads here with that person's id. It lists
  // every Task they own, whatever its status; the count is of those not Done or Cancelled.
  let owner = $state(page.url.searchParams.get('owner') ?? ''); // the Owner chosen in "All Tasks", or '' for any
  let staff = $state([]); // every Staff member, removed ones included: their Tasks still name them
  let organization = $state(''); // the id chosen in "By Organization", or '' before one is chosen
  let naming = $state(''); // the name of the Organization being created

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
  const listed = $derived(view === 'all' || view === 'mine' || (view === 'organizations' && organization !== ''));
  const complete = $derived(Boolean(draft.title.trim() && draft.description.trim()));

  let asked = 0;
  async function refresh() {
    const request = ++asked;
    // ponytail: one page. The API returns at most 1000 rows (supabase/config.toml), newest first;
    // page the list when Tasuku holds more Tasks than that.
    // "My Tasks" are the ones the reader owns or collaborates on.
    let query = (view === 'mine' ? supabase.rpc('my_tasks') : supabase.from('tasks'))
      .select('id, title, status, due_date, owner:staff!owner_id(name, email)')
      .order('id', { ascending: false });
    if (status !== 'all') query = query.eq('status', status);
    if (view === 'organizations') query = query.eq('organization_id', organization);
    if (view === 'all' && owner) query = query.eq('owner_id', owner);
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
      organization_id: draft.organization_id || null,
      earlier_task_id: Number(draft.earlier_task_id) || null,
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

  async function loadOrganizations() {
    const { data, error } = await supabase.from('organizations').select('id, name').order('name');
    if (error) problem = 'common.error';
    organizations = data ?? [];
  }

  async function createOrganization(event) {
    event.preventDefault();
    busy = true;
    const { data, error } = await supabase.from('organizations').insert({ name: naming.trim() }).select('id').single();
    busy = false;
    // 23505: the database keeps names unique, whatever their capitals.
    problem = error ? (error.code === '23505' ? 'organization.exists' : 'common.error') : '';
    if (error) return;
    naming = '';
    await loadOrganizations();
    organization = data.id;
  }

  loadOrganizations();
  supabase.from('staff').select('user_id, name, email').order('email').then(({ data }) => (staff = data ?? []));
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
    <header>
      <h1>{views.find((v) => v.id === view).label}</h1>
      {#if view === 'all'}
        <select bind:value={owner} aria-label={t('task.owner')}>
          <option value="">{t('filter.anyOwner')}</option>
          {#each staff as person (person.user_id)}
            <option value={person.user_id}>{displayName(person)}</option>
          {/each}
        </select>
      {/if}
      {#if view === 'organizations'}
        <select bind:value={organization} aria-label={t('organization.choose')}>
          <option value="">{t('organization.choose')}</option>
          {#each organizations as { id, name } (id)}
            <option value={id}>{name}</option>
          {/each}
        </select>
        <form onsubmit={createOrganization}>
          <input maxlength="120" placeholder={t('organization.name')} aria-label={t('organization.name')} bind:value={naming} />
          <Button type="submit" size="sm" icon="plus" label={t('organization.new')} disabled={busy || !naming.trim()} />
        </form>
      {/if}
    </header>
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
    <label class="choice">
      {t('task.organization')}
      <select bind:value={draft.organization_id}>
        <option value="">{t('new.orgNone')}</option>
        {#each organizations as { id, name } (id)}
          <option value={id}>{name}</option>
        {/each}
      </select>
      <small>{t('new.orgHint')}</small>
    </label>
    <Field
      label={t('task.related')}
      type="number"
      placeholder="#"
      action={t('common.optional')}
      bind:value={draft.earlier_task_id}
    />
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
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-2) var(--s-4);
    padding: var(--s-4) var(--s-5);
    border-bottom: 1px solid var(--c-border);
  }
  .panel header form {
    display: flex;
    gap: var(--s-2);
    margin-left: auto;
  }
  .panel header input {
    width: 240px;
  }
  select,
  .panel header input {
    height: 36px;
    min-width: 0;
    max-width: 100%;
    padding: 0 var(--s-2);
    border: 1px solid var(--c-border-strong);
    border-radius: var(--r-md);
    background: var(--c-surface);
    color: var(--c-text);
  }
  .choice {
    display: grid;
    gap: 6px;
    font-size: var(--fs-sm);
    font-weight: 500;
  }
  .choice small {
    color: var(--c-text-3);
    font-weight: 400;
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
