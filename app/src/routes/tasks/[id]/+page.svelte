<script>
  import { page } from '$app/state';
  import Badge from '@ui/lib/Badge.svelte';
  import Button from '@ui/lib/Button.svelte';
  import Field from '@ui/lib/Field.svelte';
  import { formatDate, t } from '@ui/i18n/index.svelte.js';
  import { auth, displayName } from '#lib/session.svelte.js';
  import { supabase } from '#lib/supabase.js';

  const columns = 'id, title, description, due_date, status, owner_id, owner:staff(name, email)';

  let task = $state(null);
  let missing = $state(false);
  let draft = $state(null); // the details being edited, or null when the Task is only shown
  let problem = $state(''); // a message key, or '' when there is nothing to report
  let busy = $state(false);

  // The button is a convenience: the database refuses everyone else (ADR 0002).
  const canEdit = $derived(
    (task?.owner_id === auth.userId || Boolean(auth.staff?.is_task_master)) &&
      !['done', 'cancelled'].includes(task?.status),
  );
  const complete = $derived(Boolean(draft?.title.trim() && draft?.description.trim()));

  async function load(id) {
    task = null;
    draft = null;
    // Nothing here may read a state this function writes: the effect below would run it again.
    const numbered = /^\d+$/.test(id);
    missing = !numbered;
    if (!numbered) return;
    const { data, error } = await supabase.from('tasks').select(columns).eq('id', id).maybeSingle();
    if (id !== page.params.id) return; // the reader has moved on to another Task
    problem = error ? 'common.error' : '';
    missing = !error && !data;
    task = data;
  }

  const edit = () =>
    (draft = { title: task.title, description: task.description, due_date: task.due_date ?? '' });

  async function save(event) {
    event.preventDefault();
    busy = true;
    const { data, error } = await supabase
      .from('tasks')
      .update({
        title: draft.title.trim(),
        description: draft.description.trim(),
        due_date: draft.due_date || null,
      })
      .eq('id', task.id)
      .select(columns)
      .single();
    busy = false;
    problem = error ? 'common.error' : '';
    if (error) return;
    task = data;
    draft = null;
  }

  $effect(() => {
    if (auth.staff) load(page.params.id);
  });
</script>

<main>
  <section class="card">
    <a href="/">← {t('nav.overview')}</a>
    {#if problem}<p class="error" role="alert">{t(problem)}</p>{/if}

    {#if !auth.staff}
      <p>{t('home.noAccess')}</p>
    {:else if missing}
      <p>{t('task.notFound')}</p>
    {:else if draft}
      <form onsubmit={save}>
        <Field label={t('new.title')} bind:value={draft.title} />
        <Field label={t('new.description')} type="textarea" bind:value={draft.description} />
        <Field label={t('task.dueDate')} type="date" action={t('common.optional')} bind:value={draft.due_date} />
        <div class="actions">
          <Button type="button" label={t('common.cancel')} onclick={() => (draft = null)} />
          <Button type="submit" variant="primary" label={t('common.save')} disabled={busy || !complete} />
        </div>
      </form>
    {:else if task}
      <div class="meta">
        <Badge status={task.status} />
        <span>{t('task.number', { id: `#${task.id}` })}</span>
        {#if canEdit}
          <Button size="sm" icon="edit" label={t('task.edit')} onclick={edit} />
        {:else}
          <Badge tone="slate" label={t('task.readOnly')} dot={false} />
        {/if}
      </div>
      <h1>{task.title}</h1>
      <dl>
        <dt>{t('task.owner')}</dt>
        <dd>{displayName(task.owner)}</dd>
        {#if task.due_date}
          <dt>{t('task.dueDate')}</dt>
          <dd>{formatDate(task.due_date, { day: 'numeric', month: 'short', year: 'numeric' })}</dd>
        {/if}
      </dl>
      <p class="description">{task.description}</p>
    {/if}
  </section>
</main>

<style>
  main {
    flex: 1;
    display: grid;
    justify-items: center;
    align-content: start;
    padding: var(--s-6) var(--s-4);
  }
  .card {
    display: grid;
    gap: var(--s-4);
    width: min(720px, 100%);
    padding: var(--s-8);
    border: 1px solid var(--c-border);
    border-radius: var(--r-xl);
    background: var(--c-surface);
    box-shadow: var(--shadow-md);
  }
  h1 {
    margin: 0;
    font-size: var(--fs-2xl);
    font-weight: 700;
    letter-spacing: -0.01em;
    overflow-wrap: anywhere;
  }
  a,
  p,
  dt,
  .meta {
    color: var(--c-text-3);
  }
  p {
    margin: 0;
  }
  .error {
    color: var(--c-red-fg);
  }
  .meta,
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-2) var(--s-3);
  }
  .actions {
    justify-content: flex-end;
  }
  dl {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: var(--s-1) var(--s-4);
    margin: 0;
  }
  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
  /* Shown exactly as written, line breaks included. */
  .description {
    color: var(--c-text);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  form {
    display: grid;
    gap: var(--s-4);
  }
</style>
