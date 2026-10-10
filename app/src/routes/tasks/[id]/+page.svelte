<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import Badge from '@ui/lib/Badge.svelte';
  import Button from '@ui/lib/Button.svelte';
  import Composer from '@ui/lib/Composer.svelte';
  import Field from '@ui/lib/Field.svelte';
  import Icon from '@ui/lib/Icon.svelte';
  import Timeline from '@ui/lib/Timeline.svelte';
  import { formatDate, formatDateTime, t } from '@ui/i18n/index.svelte.js';
  import { formatSize, prepare } from '#lib/attachments.js';
  import { auth, displayName } from '#lib/session.svelte.js';
  import { supabase } from '#lib/supabase.js';

  // Row Level Security leaves out of an answer what the reader may not read (ADR 0002): to a
  // Customer the Owner, the Organization and every Staff member come back as null.
  const columns =
    'id, title, description, due_date, status, closes_at, owner_id, customer_id, organization_id, earlier_task_id, owner:staff!owner_id(name, email), organization:organizations(name), customer:customers(user_id, email, organization_id)';

  const entryColumns =
    'id, kind, body, status, created_at, edited_at, deleted_at, author_id, subject_id, customer_id, author:staff!author_id(name, email), subject:staff!subject_id(name, email), customer:customers(email), attachments(id, path, name, mime_type, size, deleted_at)';
  // The database counts the same 15 minutes and has the last word (ADR 0002).
  const EDIT_WINDOW = 15 * 60 * 1000;

  let task = $state(null);
  let entries = $state([]); // the Timeline, oldest first
  let collaborators = $state([]); // { staff_id, staff: { name, email } }, in the order they were added
  let staff = $state([]); // every Staff member who has not been removed: who can be added
  let adding = $state(''); // the user id chosen in "Add Collaborator"
  let newOwner = $state(''); // the user id a Task Master has chosen as the new Owner
  let organizations = $state([]); // every Organization, by name
  let known = $state([]); // the Customer emails used before, offered again
  let customerEmail = $state(''); // the email being typed in "Customer"
  let names = $state({}); // for a Customer: the name of each Staff member on the Task, by user id
  let text = $state(''); // the comment being written
  let files = $state([]); // the files chosen to go with it
  let editing = $state(null); // the id of the comment being edited, or null when writing a new one
  let now = $state(Date.now()); // when the Timeline was last read: decides which comments offer "Edit"
  let missing = $state(false);
  let draft = $state(null); // the details being edited, or null when the Task is only shown
  let problem = $state(''); // a message key, or '' when there is nothing to report
  let problemFile = $state(''); // the name of the file the message is about
  let busy = $state(false);

  // The buttons are a convenience: the database refuses everyone else (ADR 0002).
  const isTaskMaster = $derived(Boolean(auth.staff?.is_task_master));
  const closed = $derived(['done', 'cancelled'].includes(task?.status));
  const canManage = $derived((task?.owner_id === auth.userId || isTaskMaster) && !closed);
  // The Customer of a Resolved Task has been asked and given a time to answer: Reopen it first.
  const canChooseCustomer = $derived(canManage && task?.status !== 'resolved');
  const collaboratorIds = $derived(collaborators.map((c) => c.staff_id));
  const canWrite = $derived(canManage || (collaboratorIds.includes(auth.userId) && !closed));
  // The Customer comments, and changes nothing else.
  const canComment = $derived(canWrite || (task?.customer_id === auth.userId && !closed));
  // An Owner who is also the Customer of their Task does not confirm their own proposal (#8).
  const asCustomer = $derived(task?.customer_id === auth.userId && task?.owner_id !== auth.userId && !closed);
  // What the reader may do to the status, each with the label of its button.
  const moves = $derived.by(() => {
    const status = task?.status;
    const live = status === 'open' || status === 'in_progress';
    const ownsAlone = task?.owner_id === auth.userId && !task?.customer_id;
    const confirms = isTaskMaster && status === 'resolved';
    return [
      status === 'in_progress' && canManage && { action: 'resolve', label: 'task.markResolved', variant: 'primary' },
      (asCustomer || (canManage && (ownsAlone || confirms))) && {
        action: 'complete',
        label: status !== 'resolved' ? 'customer.markDone' : asCustomer ? 'customer.yesDone' : 'task.confirmDone',
        variant: status === 'resolved' ? 'primary' : 'secondary',
      },
      status === 'resolved' && (asCustomer || (canManage && isTaskMaster)) && { action: 'reopen', label: 'task.reopen' },
      live && (asCustomer || canManage) && { action: 'cancel', label: asCustomer ? 'customer.cancel' : 'task.cancel' },
    ].filter(Boolean);
  });
  // A Customer reads no Staff record, only names; a Staff member who has set no name is "PSP" to them.
  const staffName = (id, person) => (person ? displayName(person) : names[id] || 'PSP');
  // A Customer reads no other Customer's record: the one before them is "Customer".
  const customerName = (customer) => customer?.email ?? t('role.customer');
  const candidates = $derived(staff.filter((s) => s.user_id !== task?.owner_id && !collaboratorIds.includes(s.user_id)));
  // Who a Task Master can give the Task to: not its Customer, who would have nobody to confirm to.
  const possibleOwners = $derived(staff.filter((s) => s.user_id !== task?.owner_id && s.user_id !== task?.customer_id));
  const complete = $derived(Boolean(draft?.title.trim() && draft?.description.trim()));

  // The entries as the Timeline component draws them. A comment is labelled by what its author was
  // on the Task when they wrote it: the Timeline is a record, so removing a Collaborator later does
  // not take the label off what they said. The events before the comment say who was on the Task:
  // its Owner is whoever opened it, until it changes hands and that Owner becomes a Collaborator.
  const shown = $derived.by(() => {
    const collaborating = new Set();
    let owner = null;
    return entries.map((entry) => {
      if (entry.kind === 'opened') owner = entry.author_id;
      if (entry.kind === 'owner_changed') {
        collaborating.add(owner);
        collaborating.delete(entry.subject_id);
        owner = entry.subject_id;
      }
      if (entry.kind === 'collaborator_added') collaborating.add(entry.subject_id);
      if (entry.kind === 'collaborator_removed') collaborating.delete(entry.subject_id);
      const actor = entry.author_id
        ? staffName(entry.author_id, entry.author)
        : entry.customer_id
          ? customerName(entry.customer)
          : 'Tasuku';
      if (entry.kind === 'opened') return { kind: 'event', icon: 'plus', actor, key: 'event.opened', at: entry.created_at };
      if (entry.kind === 'moved') return { kind: 'event', actor, key: 'event.movedTo', status: entry.status, at: entry.created_at };
      if (entry.kind === 'collaborator_added' || entry.kind === 'collaborator_removed') {
        const key = entry.kind === 'collaborator_added' ? 'event.addedCollaborator' : 'event.removedCollaborator';
        const name = staffName(entry.subject_id, entry.subject);
        return { kind: 'event', icon: 'users', actor, key, vars: { name }, at: entry.created_at };
      }
      if (entry.kind === 'owner_changed') {
        const name = staffName(entry.subject_id, entry.subject);
        return { kind: 'event', icon: 'users', actor, key: 'event.changedOwner', vars: { name }, at: entry.created_at };
      }
      if (entry.kind === 'customer_added' || entry.kind === 'customer_removed') {
        const key = entry.kind === 'customer_added' ? 'event.addedCustomer' : 'event.removedCustomer';
        return { kind: 'event', icon: 'users', actor, key, vars: { name: customerName(entry.customer) }, at: entry.created_at };
      }
      if (entry.kind === 'attachment_deleted') return { kind: 'event', icon: 'trash', actor, key: 'event.deletedAttachment', at: entry.created_at };
      // The marker stands where the comment stood, so it carries the comment's time.
      if (entry.deleted_at) return { kind: 'deleted', at: entry.created_at };
      return {
        kind: 'comment',
        id: entry.id,
        author: actor,
        role: !entry.author_id
          ? 'customer'
          : entry.author_id === owner
            ? 'owner'
            : collaborating.has(entry.author_id)
              ? 'collaborator'
              : undefined,
        at: entry.created_at,
        text: entry.body,
        edited: Boolean(entry.edited_at),
        canEdit: canComment && (entry.author_id ?? entry.customer_id) === auth.userId && now - Date.parse(entry.created_at) < EDIT_WINDOW,
        canDelete: isTaskMaster,
        files: entry.attachments.map((file) => ({
          id: file.id,
          path: file.path,
          name: file.name,
          kind: file.mime_type === 'application/pdf' ? 'pdf' : 'image',
          size: formatSize(file.size),
          deleted: Boolean(file.deleted_at),
          // On a Done or Cancelled Task only a Task Master deletes a file, as with a comment.
          canDelete: canManage || isTaskMaster,
        })),
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
    newOwner = '';
    customerEmail = '';
    text = '';
    files = [];
    editing = null;
    const numbered = /^\d+$/.test(id);
    missing = !numbered;
    if (numbered) await refresh(id);
  }

  // Reads the Task with its Timeline and the people on it: a comment can move the Task to In
  // progress, and adding a Collaborator or a Customer writes an event. The lists a Staff member
  // chooses from come back empty to a Customer, who is given the names of the Staff instead.
  async function refresh(id) {
    const [found, timeline, people, everyone, labels, emails, named] = await Promise.all([
      supabase.from('tasks').select(columns).eq('id', id).maybeSingle(),
      supabase.from('timeline_entries').select(entryColumns).eq('task_id', id).order('created_at').order('id'),
      supabase.from('task_collaborators').select('staff_id, staff:staff(name, email)').eq('task_id', id).order('added_at'),
      supabase.from('staff').select('user_id, name, email').is('removed_at', null).order('email'),
      supabase.from('organizations').select('id, name').order('name'),
      supabase.from('customers').select('email').order('email'),
      auth.staff ? { data: [] } : supabase.rpc('staff_on_task', { task: id }),
    ]);
    if (id !== page.params.id) return; // the reader has moved on to another Task
    const error =
      found.error ?? timeline.error ?? people.error ?? everyone.error ?? labels.error ?? emails.error ?? named.error;
    problem = error ? 'common.error' : '';
    missing = !error && !found.data;
    task = found.data;
    entries = timeline.data ?? [];
    collaborators = people.data ?? [];
    staff = everyone.data ?? [];
    organizations = labels.data ?? [];
    known = emails.data ?? [];
    names = Object.fromEntries((named.data ?? []).map((person) => [person.user_id, person.name]));
    now = Date.now();
  }

  const edit = () =>
    (draft = {
      title: task.title,
      description: task.description,
      due_date: task.due_date ?? '',
      organization_id: task.organization_id ?? '',
      earlier_task_id: task.earlier_task_id ?? '',
    });

  async function save(event) {
    event.preventDefault();
    busy = true;
    const { data, error } = await supabase
      .from('tasks')
      .update({
        title: draft.title.trim(),
        description: draft.description.trim(),
        due_date: draft.due_date || null,
        organization_id: draft.organization_id || null,
        earlier_task_id: Number(draft.earlier_task_id) || null,
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

  // Uploads the chosen files into the Task's folder. Resolves to what `comment_with_files` takes,
  // or to null with the problem set. A file left behind by a failure is read by nobody.
  async function uploadFiles() {
    // Every file is checked before the first one goes up, so a refusal leaves nothing behind.
    const ready = [];
    for (const file of files) {
      const prepared = await prepare(file);
      if (prepared.problem) {
        problem = prepared.problem;
        problemFile = file.name;
        return null;
      }
      ready.push(prepared);
    }
    const sent = [];
    for (const { blob, name } of ready) {
      const path = `${task.id}/${crypto.randomUUID()}`;
      // Not kept by the browser: a link that has run out, or a file since erased, must not open again.
      const { error } = await supabase.storage
        .from('attachments')
        .upload(path, blob, { contentType: blob.type, cacheControl: '0' });
      if (error) {
        problem = 'common.error';
        problemFile = name;
        return null;
      }
      sent.push({ path, name });
    }
    return sent;
  }

  // Posts the comment being written, or saves the one being edited. The text goes as written.
  // Files go with a new comment only, and a new comment may be files without text.
  async function send(body) {
    const attached = !editing && files.length > 0;
    if (busy || (!/\S/.test(body) && !attached)) return;
    busy = true;
    const comments = supabase.from('timeline_entries');
    let answer;
    if (attached) {
      const sent = await uploadFiles();
      answer = sent && (await supabase.rpc('comment_with_files', { task: task.id, body, files: sent }));
      if (answer && !answer.error) answer.data = [answer.data];
    } else if (editing) {
      answer = await comments.update({ body }).eq('id', editing).select('id');
    } else {
      answer = await comments.insert({ task_id: task.id, body }).select('id');
    }
    busy = false;
    if (!answer) return; // a file was refused: the message says which
    if (answer.error) return (problem = 'common.error');
    // An edit the database no longer allows changes no row and reports no error. The text stays in
    // the box, so nothing the person wrote is lost.
    const refused = !answer.data.length;
    editing = null;
    if (!refused) {
      text = '';
      files = [];
    }
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

  async function reassign(event) {
    event.preventDefault();
    if (busy || !newOwner) return;
    busy = true;
    const { error } = await supabase.rpc('reassign_task', { task: task.id, new_owner: newOwner });
    busy = false;
    if (error) return (problem = 'common.error');
    newOwner = '';
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

  // Through the invite function: an email Tasuku has never seen needs an account first (ADR 0003).
  async function setCustomer(event) {
    event.preventDefault();
    const email = customerEmail.trim();
    if (busy || !email) return;
    busy = true;
    const { error } = await supabase.functions.invoke('invite-customer', { body: { task_id: task.id, email } });
    busy = false;
    if (error) return (problem = error.context?.status === 400 ? 'staff.invalidEmail' : 'common.error');
    customerEmail = '';
    await refresh(page.params.id);
  }

  async function removeCustomer() {
    if (busy) return;
    busy = true;
    const { error } = await supabase.rpc('remove_customer', { task: task.id });
    busy = false;
    await refresh(page.params.id);
    if (error) problem = 'common.error';
  }

  // The Organization belongs to the Customer, not to this Task: it shows on every Task they are on.
  async function setCustomerOrganization(id) {
    const { error } = await supabase.rpc('set_customer_organization', {
      customer: task.customer.user_id,
      organization: id ? Number(id) : null,
    });
    await refresh(page.params.id);
    if (error) problem = 'common.error';
  }

  // Done and Cancelled are final, so both ask first. The database decides who may (ADR 0002).
  async function move(action) {
    const final = action === 'complete' || action === 'cancel';
    if (busy || (final && !confirm(t('task.confirmFinal')))) return;
    busy = true;
    const { error } = await supabase.rpc(`${action}_task`, { task: task.id });
    busy = false;
    await refresh(page.params.id);
    if (error) problem = 'common.error';
  }

  // The database cuts the reading and names the objects; Storage is the only way to erase them.
  // If the erasing fails the files are already out of everyone's reach.
  async function erase(paths) {
    if (!paths.length) return;
    const { error } = await supabase.storage.from('attachments').remove(paths);
    if (error) problem = 'common.error';
  }

  async function remove(entry) {
    if (!confirm(t('timeline.confirmDelete'))) return;
    const { data, error } = await supabase.rpc('delete_comment', { entry_id: entry.id });
    if (error) return (problem = 'common.error');
    if (editing === entry.id) stopEdit();
    await refresh(page.params.id);
    await erase(data);
  }

  async function removeFile(file) {
    if (!confirm(t('timeline.confirmDeleteFile', { name: file.name }))) return;
    const { data, error } = await supabase.rpc('delete_attachment', { attachment_id: file.id });
    if (error) return (problem = 'common.error');
    await refresh(page.params.id);
    await erase([data]);
  }

  // The link lives for a minute and is issued only to someone who may read the Task. The tab is
  // opened before the link is asked for: a browser blocks a tab opened after waiting.
  async function openFile(file) {
    const tab = window.open('', '_blank');
    const { data, error } = await supabase.storage.from('attachments').createSignedUrl(file.path, 60);
    if (error) {
      tab?.close();
      return (problem = 'common.error');
    }
    if (tab) {
      tab.opener = null;
      tab.location = data.signedUrl;
    }
  }

  $effect(() => {
    if (auth.staff || auth.customer) load(page.params.id);
    // An email links here (#10): whoever is not signed in asks for a magic link, which brings
    // them back to this Task.
    else if (!auth.email) goto(`/?next=${encodeURIComponent(page.url.pathname)}`, { replaceState: true });
  });
</script>

<main>
  <section class="card">
    <a href="/">← {t(auth.staff ? 'nav.overview' : 'customer.myTasks')}</a>
    {#if problem}<p class="error" role="alert">{t(problem, { name: problemFile })}</p>{/if}

    {#if !auth.staff && !auth.customer}
      <p>{t('home.noAccess')}</p>
    {:else if missing}
      <p>{t('task.notFound')}</p>
    {:else if draft}
      <form onsubmit={save}>
        <Field label={t('new.title')} bind:value={draft.title} />
        <Field label={t('new.description')} type="textarea" bind:value={draft.description} />
        <Field label={t('task.dueDate')} type="date" action={t('common.optional')} bind:value={draft.due_date} />
        <label class="choice">
          {t('task.organization')}
          <select bind:value={draft.organization_id}>
            <option value="">{t('new.orgNone')}</option>
            {#each organizations as { id, name } (id)}
              <option value={id}>{name}</option>
            {/each}
          </select>
        </label>
        <Field
          label={t('task.related')}
          type="number"
          placeholder="#"
          action={t('common.optional')}
          bind:value={draft.earlier_task_id}
        />
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
        {:else if auth.staff}
          <Badge tone="slate" label={t('task.readOnly')} dot={false} />
        {/if}
      </div>
      <h1>{task.title}</h1>
      <dl>
        <dt>{t('task.owner')}</dt>
        <dd>
          {staffName(task.owner_id, task.owner)}
          {#if isTaskMaster && !closed && possibleOwners.length}
            <form class="add" onsubmit={reassign}>
              <select bind:value={newOwner} aria-label={t('task.newOwner')}>
                <option value="">{t('task.newOwner')}</option>
                {#each possibleOwners as person (person.user_id)}
                  <option value={person.user_id}>{displayName(person)}</option>
                {/each}
              </select>
              <Button type="submit" size="sm" icon="users" label={t('task.reassign')} disabled={busy || !newOwner} />
            </form>
          {/if}
        </dd>
        {#if auth.staff}
        <dt>{t('task.organization')}</dt>
        <dd>{task.organization?.name ?? t('new.orgNone')}</dd>
        <dt>{t('task.customer')}</dt>
        <dd>
          <ul class="people">
            {#if task.customer}
              <li>
                {task.customer.email}
                {#if canChooseCustomer}
                  <button
                    class="x"
                    aria-label={t('task.removeCustomer', { name: task.customer.email })}
                    onclick={removeCustomer}><Icon name="x" size={14} /></button
                  >
                {/if}
              </li>
            {:else}
              <li class="none">{t('org.noCustomer')}</li>
            {/if}
          </ul>
          {#if task.customer}
            <label class="add">
              {t('task.customerOrganization')}
              <select
                value={task.customer.organization_id ?? ''}
                onchange={(event) => setCustomerOrganization(event.currentTarget.value)}
              >
                <option value="">{t('organization.none')}</option>
                {#each organizations as { id, name } (id)}
                  <option value={id}>{name}</option>
                {/each}
              </select>
            </label>
          {/if}
          {#if canChooseCustomer}
            <form class="add" onsubmit={setCustomer}>
              <input
                type="email"
                list="known-customers"
                placeholder={t('new.customerEmail')}
                aria-label={t('new.customerEmail')}
                bind:value={customerEmail}
              />
              <datalist id="known-customers">
                {#each known as { email } (email)}
                  <option value={email}></option>
                {/each}
              </datalist>
              <Button
                type="submit"
                size="sm"
                icon={task.customer ? 'edit' : 'plus'}
                label={t(task.customer ? 'common.change' : 'common.add')}
                disabled={busy || !customerEmail.trim()}
              />
            </form>
            <small>{t('task.customerHint')}</small>
          {/if}
        </dd>
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
        {/if}
        {#if task.earlier_task_id}
          <dt>{t('task.related')}</dt>
          <dd>
            {#if auth.staff}
              <a href="/tasks/{task.earlier_task_id}">#{task.earlier_task_id}</a>
            {:else}
              #{task.earlier_task_id}
            {/if}
          </dd>
        {/if}
        {#if task.due_date}
          <dt>{t('task.dueDate')}</dt>
          <dd>{formatDate(task.due_date, { day: 'numeric', month: 'short', year: 'numeric' })}</dd>
        {/if}
      </dl>
      <p class="description">{task.description}</p>
      {#if task.status === 'resolved' && task.closes_at}
        <p role="status">{t('task.closesAt', { when: formatDateTime(task.closes_at) })}</p>
      {/if}
      {#if moves.length || auth.staff}
        <div class="actions">
          {#if auth.staff}<a href="/?earlier={task.id}">{t('task.newRelated')}</a>{/if}
          {#each moves as { action, label, variant } (action)}
            <Button size="sm" {variant} label={t(label)} disabled={busy} onclick={() => move(action)} />
          {/each}
        </div>
      {/if}

      <h2>{t('timeline.title')}</h2>
      <Timeline entries={shown} cards viewer={auth.staff ? 'staff' : 'customer'} onedit={startEdit} ondelete={remove} onopen={openFile} ondeletefile={removeFile} />
      {#if editing}
        <div class="meta">
          <span>{t('timeline.editing')}</span>
          <Button size="sm" label={t('common.cancel')} onclick={stopEdit} />
        </div>
      {/if}
      <Composer
        bind:value={text}
        bind:files
        attach={!editing}
        placeholder={auth.staff ? undefined : t('composer.reply')}
        sendLabel={editing ? t('common.save') : undefined}
        disabled={!canComment}
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
  .add {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-2);
    margin-top: var(--s-2);
  }
  small {
    color: var(--c-text-3);
  }
  .choice {
    display: grid;
    gap: 6px;
    font-size: var(--fs-sm);
    font-weight: 500;
  }
  select,
  .add input {
    height: 32px;
    max-width: 100%;
    padding: 0 var(--s-2);
    border: 1px solid var(--c-border-strong);
    border-radius: var(--r-md);
    background: var(--c-surface);
    color: var(--c-text);
  }
</style>
