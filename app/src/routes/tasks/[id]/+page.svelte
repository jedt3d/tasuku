<script>
  import { page } from '$app/state';
  import Badge from '@ui/lib/Badge.svelte';
  import Button from '@ui/lib/Button.svelte';
  import Composer from '@ui/lib/Composer.svelte';
  import Field from '@ui/lib/Field.svelte';
  import Icon from '@ui/lib/Icon.svelte';
  import Timeline from '@ui/lib/Timeline.svelte';
  import { formatDate, t } from '@ui/i18n/index.svelte.js';
  import { auth, displayName } from '#lib/session.svelte.js';
  import { supabase } from '#lib/supabase.js';

  const columns = 'id, title, description, due_date, status, owner_id, owner:staff!owner_id(name, email)';

  const entryColumns =
    'id, kind, body, status, created_at, edited_at, deleted_at, author_id, subject_id, author:staff!author_id(name, email), subject:staff!subject_id(name, email)';
  // The database counts the same 15 minutes and has the last word (ADR 0002).
  const EDIT_WINDOW = 15 * 60 * 1000;

  let task = $state(null);
  let entries = $state([]); // the Timeline, oldest first
  let collaborators = $state([]); // { staff_id, staff: { name, email } }, in the order they were added
  let staff = $state([]); // every Staff member who has not been removed: who can be added
  let adding = $state(''); // the user id chosen in "Add Collaborator"
  let text = $state(''); // the comment being written
  let editing = $state(null); // the id of the comment being edited, or null when writing a new one
  let now = $state(Date.now()); // when the Timeline was last read: decides which comments offer "Edit"
  let missing = $state(false);
  let draft = $state(null); // the details being edited, or null when the Task is only shown
  let problem = $state(''); // a message key, or '' when there is nothing to report
  let busy = $state(false);

  // The buttons are a convenience: the database refuses everyone else (ADR 0002).
  const isTaskMaster = $derived(Boolean(auth.staff?.is_task_master));
  const closed = $derived(['done', 'cancelled'].includes(task?.status));
  const canManage = $derived((task?.owner_id === auth.userId || isTaskMaster) && !closed);
  const collaboratorIds = $derived(collaborators.map((c) => c.staff_id));
  const canWrite = $derived(canManage || (collaboratorIds.includes(auth.userId) && !closed));
  const candidates = $derived(staff.filter((s) => s.user_id !== task?.owner_id && !collaboratorIds.includes(s.user_id)));
  const complete = $derived(Boolean(draft?.title.trim() && draft?.description.trim()));

  // The entries as the Timeline component draws them. A comment is labelled by what its author was
  // on the Task when they wrote it: the Timeline is a record, so removing a Collaborator later does
  // not take the label off what they said. The events before the comment say who was on the Task.
  const shown = $derived.by(() => {
    const collaborating = new Set();
    return entries.map((entry) => {
      if (entry.kind === 'collaborator_added') collaborating.add(entry.subject_id);
      if (entry.kind === 'collaborator_removed') collaborating.delete(entry.subject_id);
      const actor = entry.author ? displayName(entry.author) : 'Tasuku';
      if (entry.kind === 'opened') return { kind: 'event', icon: 'plus', actor, key: 'event.opened', at: entry.created_at };
      if (entry.kind === 'moved') return { kind: 'event', actor, key: 'event.movedTo', status: entry.status, at: entry.created_at };
      if (entry.kind === 'collaborator_added' || entry.kind === 'collaborator_removed') {
        const key = entry.kind === 'collaborator_added' ? 'event.addedCollaborator' : 'event.removedCollaborator';
        return { kind: 'event', icon: 'users', actor, key, vars: { name: displayName(entry.subject) }, at: entry.created_at };
      }
      // The marker stands where the comment stood, so it carries the comment's time.
      if (entry.deleted_at) return { kind: 'deleted', at: entry.created_at };
      return {
        kind: 'comment',
        id: entry.id,
        author: actor,
        role: entry.author_id === task?.owner_id ? 'owner' : collaborating.has(entry.author_id) ? 'collaborator' : undefined,
        at: entry.created_at,
        text: entry.body,
        edited: Boolean(entry.edited_at),
        canEdit: canWrite && entry.author_id === auth.userId && now - Date.parse(entry.created_at) < EDIT_WINDOW,
        canDelete: isTaskMaster,
      };
    });
  });

  // Nothing in `load` or `refresh` may read, before its first `await`, a state it writes: the effect
  // below would run it again.
  async function load(id) {
    task = null;
    draft = null;
    entries = [];
    collaborators = [];
    adding = '';
    text = '';
    editing = null;
    const numbered = /^\d+$/.test(id);
    missing = !numbered;
    if (numbered) await refresh(id);
  }

  // Reads the Task with its Timeline and the people on it: a comment can move the Task to In
  // progress, and adding a Collaborator writes an event.
  async function refresh(id) {
    const [found, timeline, people, everyone] = await Promise.all([
      supabase.from('tasks').select(columns).eq('id', id).maybeSingle(),
      supabase.from('timeline_entries').select(entryColumns).eq('task_id', id).order('created_at').order('id'),
      supabase.from('task_collaborators').select('staff_id, staff:staff(name, email)').eq('task_id', id).order('added_at'),
      supabase.from('staff').select('user_id, name, email').is('removed_at', null).order('email'),
    ]);
    if (id !== page.params.id) return; // the reader has moved on to another Task
    const error = found.error ?? timeline.error ?? people.error ?? everyone.error;
    problem = error ? 'common.error' : '';
    missing = !error && !found.data;
    task = found.data;
    entries = timeline.data ?? [];
    collaborators = people.data ?? [];
    staff = everyone.data ?? [];
    now = Date.now();
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

  function startEdit(entry) {
    editing = entry.id;
    text = entry.text;
  }

  function stopEdit() {
    editing = null;
    text = '';
  }

  // Posts the comment being written, or saves the one being edited. The text goes as written.
  async function send(body) {
    if (busy || !/\S/.test(body)) return;
    busy = true;
    const comments = supabase.from('timeline_entries');
    const { data, error } = editing
      ? await comments.update({ body }).eq('id', editing).select('id')
      : await comments.insert({ task_id: task.id, body }).select('id');
    busy = false;
    if (error) return (problem = 'common.error');
    // An edit the database no longer allows changes no row and reports no error. The text stays in
    // the box, so nothing the person wrote is lost.
    const refused = !data.length;
    editing = null;
    if (!refused) text = '';
    await refresh(page.params.id);
    if (refused) problem = 'timeline.editClosed';
  }

  async function addCollaborator(event) {
    event.preventDefault();
    if (busy || !adding) return;
    busy = true;
    const { error } = await supabase.from('task_collaborators').insert({ task_id: task.id, staff_id: adding });
    busy = false;
    if (error) return (problem = 'common.error');
    adding = '';
    await refresh(page.params.id);
  }

  async function removeCollaborator(staffId) {
    if (busy) return;
    busy = true;
    const { data, error } = await supabase
      .from('task_collaborators')
      .delete()
      .eq('task_id', task.id)
      .eq('staff_id', staffId)
      .select('staff_id');
    busy = false;
    await refresh(page.params.id);
    // A removal the database refuses deletes no row and reports no error.
    if (error || !data.length) problem = 'common.error';
  }

  async function remove(entry) {
    if (!confirm(t('timeline.confirmDelete'))) return;
    const { error } = await supabase.rpc('delete_comment', { entry_id: entry.id });
    if (error) return (problem = 'common.error');
    if (editing === entry.id) stopEdit();
    await refresh(page.params.id);
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
        {#if canWrite}
          <Button size="sm" icon="edit" label={t('task.edit')} onclick={edit} />
        {:else}
          <Badge tone="slate" label={t('task.readOnly')} dot={false} />
        {/if}
      </div>
      <h1>{task.title}</h1>
      <dl>
        <dt>{t('task.owner')}</dt>
        <dd>{displayName(task.owner)}</dd>
        <dt>{t('task.collaborators')}</dt>
        <dd>
          <ul class="people">
            {#each collaborators as { staff_id, staff: person } (staff_id)}
              <li>
                {displayName(person)}
                {#if canManage}
                  <button
                    class="x"
                    aria-label={t('task.removeCollaborator', { name: displayName(person) })}
                    onclick={() => removeCollaborator(staff_id)}><Icon name="x" size={14} /></button
                  >
                {/if}
              </li>
            {:else}
              <li class="none">{t('task.noCollaborators')}</li>
            {/each}
          </ul>
          {#if canManage && candidates.length}
            <form class="add" onsubmit={addCollaborator}>
              <select bind:value={adding} aria-label={t('task.addCollaborator')}>
                <option value="">{t('task.chooseStaff')}</option>
                {#each candidates as person (person.user_id)}
                  <option value={person.user_id}>{displayName(person)}</option>
                {/each}
              </select>
              <Button type="submit" size="sm" icon="plus" label={t('common.add')} disabled={busy || !adding} />
            </form>
          {/if}
        </dd>
        {#if task.due_date}
          <dt>{t('task.dueDate')}</dt>
          <dd>{formatDate(task.due_date, { day: 'numeric', month: 'short', year: 'numeric' })}</dd>
        {/if}
      </dl>
      <p class="description">{task.description}</p>

      <h2>{t('timeline.title')}</h2>
      <Timeline entries={shown} cards onedit={startEdit} ondelete={remove} />
      {#if editing}
        <div class="meta">
          <span>{t('timeline.editing')}</span>
          <Button size="sm" label={t('common.cancel')} onclick={stopEdit} />
        </div>
      {/if}
      <Composer
        bind:value={text}
        attach={false}
        sendLabel={editing ? t('common.save') : undefined}
        disabled={!canWrite}
        disabledReason={t(closed ? 'composer.closed' : 'composer.locked')}
        onsend={send}
      />
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
  h2 {
    margin: var(--s-4) 0 0;
    font-size: var(--fs-lg);
    font-weight: 600;
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
  .people {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-1) var(--s-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .people li {
    display: inline-flex;
    align-items: center;
    gap: var(--s-1);
  }
  .none {
    color: var(--c-text-3);
  }
  .x {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: none;
    color: var(--c-text-3);
    cursor: pointer;
  }
  .x:hover {
    background: var(--c-surface-2);
    color: var(--c-red-fg);
  }
  form.add {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-2);
    margin-top: var(--s-2);
  }
  .add select {
    height: 32px;
    max-width: 100%;
    padding: 0 var(--s-2);
    border: 1px solid var(--c-border-strong);
    border-radius: var(--r-md);
    background: var(--c-surface);
    color: var(--c-text);
  }
</style>
