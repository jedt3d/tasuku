<script>
  import Badge from '@ui/lib/Badge.svelte';
  import Button from '@ui/lib/Button.svelte';
  import { t } from '@ui/i18n/index.svelte.js';
  import { auth } from '#lib/session.svelte.js';
  import { FINAL } from '#lib/status.js';
  import { supabase } from '#lib/supabase.js';

  // A Task Master sees every Customer; any other Staff member the Customers on the Tasks they own.
  // That is a choice of this page, not a rule of reading: every Staff member reads every Customer
  // record. Who removes one is decided by the database (`remove_customer`, ADR 0002).
  let customers = $state([]);
  let staffIds = $state(new Set()); // the Staff members who are not removed
  let closeAs = $state({}); // for a Customer who is also Staff: the final status chosen, by user id
  let problem = $state(''); // a message key, or '' when there is nothing to report
  let busy = $state(false);

  const isTaskMaster = $derived(Boolean(auth.staff?.is_task_master));
  const shown = $derived(
    isTaskMaster ? customers : customers.filter((c) => c.tasks.some((task) => task.owner_id === auth.userId)),
  );
  const unfinished = (customer) => customer.tasks.filter((task) => !FINAL.includes(task.status)).length;

  // ponytail: one page of rows each (1000); page through them if Tasuku ever holds that many.
  async function refresh() {
    const [found, staff] = await Promise.all([
      supabase
        .from('customers')
        .select('user_id, email, removed_at, organization:organizations(name), tasks(id, status, owner_id)')
        .order('email')
        .order('id', { referencedTable: 'tasks' }),
      supabase.from('staff').select('user_id').is('removed_at', null),
    ]);
    if (found.error ?? staff.error) return (problem = 'common.error');
    customers = found.data;
    staffIds = new Set(staff.data.map((person) => person.user_id));
  }

  // Runs one change, reports what went wrong, and shows the list as the database now has it.
  async function change(name, args) {
    busy = true;
    const { error } = await supabase.rpc(name, args);
    problem = !error ? '' : error.code === 'TSK04' ? 'customers.needStatus' : 'common.error';
    busy = false;
    await refresh();
  }

  function remove(customer) {
    const status = closeAs[customer.user_id];
    const n = staffIds.has(customer.user_id) ? unfinished(customer) : 0;
    const question = n
      ? t('customers.confirmRemoveStaff', { email: customer.email, n, status: t(`status.${status}`) })
      : t('customers.confirmRemove', { email: customer.email });
    if (!confirm(question)) return;
    change('remove_customer', { customer: customer.user_id, ...(n && { final_status: status }) });
  }

  $effect(() => {
    if (auth.staff) refresh();
  });
</script>

<main>
  <section class="card">
    <a href="/">← {t('home.title')}</a>
    <h1>{t('nav.customers')}</h1>

    {#if !auth.staff}
      <p>{t('home.noAccess')}</p>
    {:else}
      <p>{t(isTaskMaster ? 'customers.hint' : 'customers.hintOwner')}</p>
      {#if problem}<p class="error" role="alert">{t(problem)}</p>{/if}

      <ul>
        {#each shown as customer (customer.user_id)}
          {@const alsoStaff = staffIds.has(customer.user_id)}
          {@const toClose = alsoStaff ? unfinished(customer) : 0}
          <li class:removed={customer.removed_at}>
            <span class="who">
              <span class="email">{customer.email}</span>
              {#if customer.organization}<span class="address">{customer.organization.name}</span>{/if}
              {#if alsoStaff}<Badge tone="blue" label={t('customers.alsoStaff')} dot={false} />{/if}
              {#if customer.removed_at}<Badge tone="red" label={t('staff.removed')} />{/if}
              {#each customer.tasks as task (task.id)}
                <a href="/tasks/{task.id}" title={t(`status.${task.status}`)}>#{task.id}</a>
              {/each}
            </span>
            <span class="actions">
              {#if customer.removed_at}
                {#if isTaskMaster}
                  <Button
                    size="sm"
                    label={t('customers.restore')}
                    disabled={busy}
                    onclick={() => change('restore_customer', { customer: customer.user_id })}
                  />
                {/if}
              {:else if alsoStaff && !isTaskMaster}
                <small>{t('customers.askTaskMaster')}</small>
              {:else}
                {#if toClose}
                  <label>
                    {t('customers.closeAs', { n: toClose })}
                    <select bind:value={closeAs[customer.user_id]}>
                      <option value={undefined}>{t('customers.choose')}</option>
                      <option value="done">{t('status.done')}</option>
                      <option value="cancelled">{t('status.cancelled')}</option>
                    </select>
                  </label>
                {/if}
                <Button
                  size="sm"
                  icon="trash"
                  label={t('staff.remove')}
                  disabled={busy || Boolean(toClose && !closeAs[customer.user_id])}
                  onclick={() => remove(customer)}
                />
              {/if}
            </span>
          </li>
        {:else}
          <li><span class="address">{t('customers.none')}</span></li>
        {/each}
      </ul>
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
  .actions,
  label {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-2);
  }
  label,
  small {
    color: var(--c-text-3);
    font-size: var(--fs-sm);
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
