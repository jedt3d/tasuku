<script>
  import Badge from '@ui/lib/Badge.svelte';
  import Button from '@ui/lib/Button.svelte';
  import Field from '@ui/lib/Field.svelte';
  import { t } from '@ui/i18n/index.svelte.js';
  import { auth, displayName } from '#lib/session.svelte.js';
  import { supabase } from '#lib/supabase.js';

  // Every Staff member may read this list; only a Task Master is offered the actions. The buttons
  // are a convenience: the database and the invite function refuse everyone else (ADR 0002, 0003).
  let people = $state([]);
  let email = $state('');
  let name = $state(auth.staff?.name ?? '');
  let problem = $state(''); // a message key, or '' when there is nothing to report
  let busy = $state(false);
  let unerased = $state([]); // for a Task Master: deleted files whose object is still in Storage
  let owned = $state({}); // how many Tasks not Done or Cancelled each Staff member owns, by user id
  let periods = $state(null); // for a Task Master: the two periods of automatic closure

  const isTaskMaster = $derived(Boolean(auth.staff?.is_task_master));

  async function refresh() {
    const { data, error } = await supabase
      .from('staff')
      .select('user_id, name, email, is_task_master, removed_at')
      .order('email');
    if (error) problem = 'common.error';
    else people = data;
    // ponytail: counted here from one page of rows (1000); count in the database if that is passed.
    const live = await supabase.from('tasks').select('owner_id').not('status', 'in', '(done,cancelled)');
    if (live.error) problem = 'common.error';
    owned = {};
    for (const { owner_id } of live.data ?? []) owned[owner_id] = (owned[owner_id] ?? 0) + 1;
    if (isTaskMaster) unerased = (await supabase.rpc('unerased_attachments')).data ?? [];
    if (isTaskMaster) periods = (await supabase.from('settings').select('closure_hours, reminder_hours').single()).data;
  }

  function savePeriods(event) {
    event.preventDefault();
    change(async () => {
      const { error } = await supabase.from('settings').update(periods).eq('id', true);
      if (!error) return '';
      // 23514: the limits; 22P02: not a whole number.
      return ['23514', '22P02'].includes(error.code) ? 'settings.invalid' : 'common.error';
    });
  }

  // Finishes what a deletion left undone. Nobody could read these files; now they are gone.
  const erase = () =>
    change(async () => {
      const { error } = await supabase.storage.from('attachments').remove(unerased.map((file) => file.path));
      return error ? 'common.error' : '';
    });

  // Runs one change, reports what went wrong, and shows the list as the database now has it.
  async function change(action, mine = false) {
    busy = true;
    problem = '';
    problem = await action();
    busy = false;
    // A change to my own record changes what I may do: start again from what the database says.
    if (mine && !problem) location.reload();
    else await refresh();
  }

  const rpc = (name, args) => async () => {
    const { error } = await supabase.rpc(name, args);
    if (!error) return '';
    return error.code === 'TSK01' ? 'staff.lastTaskMaster' : 'common.error';
  };

  const invite = (address) => async () => {
    const { error } = await supabase.functions.invoke('invite-staff', { body: { email: address } });
    if (!error) return '';
    return error.context?.status === 400 ? 'staff.invalidEmail' : 'common.error';
  };

  async function add(event) {
    event.preventDefault();
    const address = email.trim();
    if (!address) return;
    await change(invite(address));
    if (!problem) email = '';
  }

  const rename = (value) => async () => {
    const { error } = await supabase.from('staff').update({ name: value }).eq('user_id', auth.userId);
    if (error) return 'common.error';
    auth.staff.name = value;
    return '';
  };

  function saveName(event) {
    event.preventDefault();
    change(rename(name.trim()));
  }

  const setTaskMaster = (person, value) =>
    change(rpc('set_task_master', { staff_id: person.user_id, value }), person.user_id === auth.userId);

  function remove(person) {
    // Removing takes the access away at once; the Tasks stay theirs until a Task Master reassigns them.
    const n = owned[person.user_id];
    if (!confirm(t(n ? 'staff.confirmRemoveOwner' : 'staff.confirmRemove', { email: person.email, n }))) return;
    change(rpc('remove_staff', { staff_id: person.user_id }), person.user_id === auth.userId);
  }

  $effect(() => {
    if (auth.staff) refresh();
  });
</script>

<main>
  <section class="card">
    <a href="/">← {t('home.title')}</a>
    <h1>{t('nav.staff')}</h1>

    {#if !auth.staff}
      <p>{t('home.noAccess')}</p>
    {:else}
      <form onsubmit={saveName}>
        <Field label={t('staff.name')} icon="user" hint={t('staff.nameHint')} bind:value={name} />
        <Button type="submit" label={t('common.save')} disabled={busy} />
      </form>
      {#if isTaskMaster}
        <form onsubmit={add}>
          <Field
            label={t('staff.email')}
            type="email"
            icon="mail"
            placeholder="name@example.com"
            hint={t('staff.addHint')}
            bind:value={email}
          />
          <Button type="submit" variant="primary" icon="userPlus" label={t('common.add')} disabled={busy} />
        </form>
        {#if periods}
          <form onsubmit={savePeriods}>
            <Field
              label={t('settings.closureHours')}
              type="number"
              hint={t('settings.closureHint')}
              bind:value={periods.closure_hours}
            />
            <Field label={t('settings.reminderHours')} type="number" bind:value={periods.reminder_hours} />
            <Button type="submit" label={t('common.save')} disabled={busy} />
          </form>
        {/if}
      {/if}
      {#if problem}<p class="error" role="alert">{t(problem)}</p>{/if}
      {#if unerased.length}
        <div class="report" role="status">
          <p>
            {t('attach.unerased', { n: unerased.length })}
            {#each [...new Set(unerased.map((file) => file.task_id))] as id (id)}
              <a href="/tasks/{id}">#{id}</a>{' '}
            {/each}
          </p>
          <Button size="sm" icon="trash" label={t('attach.eraseNow')} disabled={busy} onclick={erase} />
        </div>
      {/if}

      <ul>
        {#each people as person (person.user_id)}
          <li class:removed={person.removed_at}>
            <span class="who">
              <span class="email">{displayName(person)}</span>
              {#if person.name}<span class="address">{person.email}</span>{/if}
              {#if person.user_id === auth.userId}<Badge tone="blue" label={t('staff.you')} dot={false} />{/if}
              {#if person.is_task_master}<Badge tone="green" label={t('staff.taskMaster')} />{/if}
              {#if person.removed_at}<Badge tone="red" label={t('staff.removed')} />{/if}
              {#if owned[person.user_id]}
                <a href="/?owner={person.user_id}">{t('staff.unfinished', { n: owned[person.user_id] })}</a>
              {/if}
            </span>
            {#if isTaskMaster}
              <span class="actions">
                {#if person.removed_at}
                  <Button size="sm" label={t('staff.addAgain')} disabled={busy} onclick={() => change(invite(person.email))} />
                {:else}
                  <Button
                    size="sm"
                    label={t(person.is_task_master ? 'staff.demote' : 'staff.promote')}
                    disabled={busy}
                    onclick={() => setTaskMaster(person, !person.is_task_master)}
                  />
                  <Button size="sm" icon="trash" label={t('staff.remove')} disabled={busy} onclick={() => remove(person)} />
                {/if}
              </span>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</main>

<style>
  .report {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    padding: var(--s-3);
    border: 1px solid var(--c-border-strong);
    border-radius: var(--r-md);
    font-size: var(--fs-sm);
  }
  .report p {
    flex: 1;
    margin: 0;
  }
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
  }
  a {
    color: var(--c-text-3);
  }
  p {
    margin: 0;
    color: var(--c-text-3);
  }
  .error {
    color: var(--c-red-fg);
  }
  form {
    display: grid;
    gap: var(--s-3);
    justify-items: start;
  }
  form :global(.field) {
    width: 100%;
  }
  ul {
    display: grid;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-2) var(--s-4);
    padding: var(--s-3) 0;
    border-top: 1px solid var(--c-border);
  }
  .who,
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-2);
  }
  .email {
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  .address {
    color: var(--c-text-3);
    overflow-wrap: anywhere;
  }
  .removed .email {
    color: var(--c-text-3);
    text-decoration: line-through;
  }
</style>
