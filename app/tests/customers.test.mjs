import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addCollaborator,
  addCustomer,
  admin,
  anonymous,
  close,
  comment,
  createOrganization,
  customerOf,
  openTask,
  signIn,
  signInAs,
  staffMember,
  taskMaster,
  uniqueEmail,
  userId,
} from './helpers.mjs';

const status = (result) => result.error?.context?.status ?? 200;

// The ids of the Tasks `client` reads.
const tasksOf = async (client) => (await client.from('tasks').select('id').order('id')).data.map((task) => task.id);

// The Customer of `task` as `client` reads it: their email, or null when the Task has none.
async function customerEmail(client, task) {
  const { data, error } = await client.from('tasks').select('customer:customers(email)').eq('id', task.id).single();
  if (error) throw error;
  return data.customer?.email ?? null;
}

test('the Owner adds a Customer by an email Tasuku has never seen: the Customer can sign in and read the Task', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);
  const email = uniqueEmail('customer');

  const added = await addCustomer(owner, task, ` ${email.toUpperCase()} `); // typed carelessly

  assert.equal(added.error, null);
  assert.equal(await customerEmail(owner, task), email);
  const sent = await anonymous().auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  assert.equal(sent.error, null);
  const customer = await signIn(email);
  assert.deepEqual(await tasksOf(customer), [task.id]);
});

// The Timeline of `task` as `client` reads it, oldest first.
async function timeline(client, task, columns = 'kind, author_id, customer_id') {
  const { data, error } = await client
    .from('timeline_entries')
    .select(columns)
    .eq('task_id', task.id)
    .order('created_at')
    .order('id');
  if (error) throw error;
  return data;
}

test('an email used before is offered again, and the same Customer can be on several Tasks', async () => {
  const owner = await staffMember();
  const first = await openTask(owner);
  const second = await openTask(owner);
  const email = uniqueEmail('customer');
  await addCustomer(owner, first, email);

  const offered = await (await staffMember()).from('customers').select('email').eq('email', email);
  const again = await addCustomer(owner, second, email);

  assert.deepEqual(offered.data, [{ email }]);
  assert.equal(again.error, null);
  assert.deepEqual(await tasksOf(await signIn(email)), [first.id, second.id]);
});

test('a Task that has a Customer takes no other: the first stays, and no account is made for the second', async () => {
  const owner = await staffMember();
  const master = await taskMaster();
  const task = await openTask(owner);
  const first = await customerOf(owner, task);
  const wanted = uniqueEmail('second');

  for (const client of [owner, master]) {
    assert.equal(status(await addCustomer(client, task, wanted)), 403);
  }

  assert.equal(await customerEmail(owner, task), (await first.auth.getUser()).data.user.email);
  assert.deepEqual(await tasksOf(first), [task.id]);
  assert.equal((await comment(first, task, 'Still here.')).error, null);
  const sent = await anonymous().auth.signInWithOtp({ email: wanted, options: { shouldCreateUser: false } });
  assert.equal(sent.error?.code, 'otp_disabled');
});

test('nobody takes a Customer off a Task', async () => {
  const owner = await staffMember();
  const master = await taskMaster();
  const task = await openTask(owner);
  const customer = await customerOf(owner, task);

  for (const client of [owner, master]) {
    // The function is gone, and the column is granted to nobody.
    assert.equal((await client.rpc('remove_customer', { task: task.id })).error?.code, 'PGRST202');
    assert.equal((await client.from('tasks').update({ customer_id: null }).eq('id', task.id)).error?.code, '42501');
  }

  assert.deepEqual(await tasksOf(customer), [task.id]);
});

test('adding a Customer appears on the Timeline, with who did it and to whom', async () => {
  const owner = await staffMember();
  const master = await taskMaster();
  const task = await openTask(owner);
  const customer = await userId(await customerOf(master, task));

  const entries = await timeline(owner, task);

  assert.deepEqual(entries.slice(1), [{ kind: 'customer_added', author_id: await userId(master), customer_id: customer }]);
});

test('adding the Customer a Task already has changes nothing', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);
  const email = uniqueEmail('customer');
  await addCustomer(owner, task, email);

  const again = await addCustomer(owner, task, email);

  assert.equal(again.error, null);
  assert.deepEqual((await timeline(owner, task)).map((entry) => entry.kind), ['opened', 'customer_added']);
});

test('only the Owner and a Task Master choose the Customer, and nobody else makes Tasuku create an account', async () => {
  const owner = await staffMember();
  const collaborator = await staffMember();
  const task = await openTask(owner);
  await addCollaborator(owner, task, collaborator);
  // A Customer of another Task: this one has none yet, so only who asks decides the answer.
  const customer = await customerOf(owner, await openTask(owner));
  const wanted = uniqueEmail('wanted');

  for (const client of [collaborator, await staffMember(), customer, await signInAs(uniqueEmail('stranger')), anonymous()]) {
    assert.equal(status(await addCustomer(client, task, wanted)), 403);
    assert.equal((await client.rpc('set_customer', { task: task.id, customer_email: wanted })).error?.code, '42501');
  }

  assert.equal(await customerEmail(owner, task), null);
  const sent = await anonymous().auth.signInWithOtp({ email: wanted, options: { shouldCreateUser: false } });
  assert.equal(sent.error?.code, 'otp_disabled');
});

test('a Customer is refused when the email is not an email address or the Task does not exist', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);

  assert.equal(status(await addCustomer(owner, task, 'not an email')), 400);
  assert.equal(status(await addCustomer(owner, { id: 'one' }, uniqueEmail('customer'))), 400);
  assert.equal(status(await addCustomer(owner, { id: 2 ** 40 }, uniqueEmail('customer'))), 403);
});

test('nobody changes the Customer of a Task that is Done or Cancelled, who still reads it', async () => {
  const owner = await staffMember();
  const master = await taskMaster();

  for (const closing of ['done', 'cancelled']) {
    const task = await openTask(owner);
    const customer = await customerOf(owner, task);
    await close(customer, task, closing);

    for (const client of [owner, master]) {
      assert.equal(status(await addCustomer(client, task, uniqueEmail('late'))), 403);
    }
    assert.deepEqual(await tasksOf(customer), [task.id]);
  }
});

test('a Customer reads only the Tasks they are on, their Timelines, and their own record', async () => {
  const owner = await staffMember();
  const hospital = (await createOrganization(owner)).data.id;
  const mine = await openTask(owner, { organization_id: hospital });
  const theirs = await openTask(owner, { organization_id: hospital });
  await comment(owner, mine, 'For the first Customer.');
  await comment(owner, theirs, 'For the second Customer.');
  await addCollaborator(owner, mine, await staffMember());
  const email = uniqueEmail('customer');
  const customer = await customerOf(owner, mine, email);
  const colleague = await customerOf(owner, theirs); // another Customer of the same Organization
  for (const client of [customer, colleague]) {
    await owner.rpc('set_customer_organization', { customer: await userId(client), organization: hospital });
  }
  const unregistered = await signInAs(uniqueEmail('unregistered'));
  const read = async (client, table, columns = '*') => (await client.from(table).select(columns)).data;

  assert.deepEqual(await tasksOf(customer), [mine.id]);
  assert.deepEqual(await tasksOf(colleague), [theirs.id]);
  assert.deepEqual(await tasksOf(unregistered), []);

  assert.deepEqual(
    (await read(customer, 'timeline_entries', 'task_id, kind')).map((entry) => entry.kind).sort(),
    ['collaborator_added', 'comment', 'customer_added', 'moved', 'opened'], // read in no order
  );
  assert.deepEqual([...new Set((await read(colleague, 'timeline_entries', 'task_id')).map((e) => e.task_id))], [theirs.id]);
  assert.deepEqual(await read(unregistered, 'timeline_entries'), []);

  assert.deepEqual(await read(customer, 'customers', 'email'), [{ email }]);
  assert.equal((await read(colleague, 'customers')).length, 1);
  assert.deepEqual(await read(unregistered, 'customers'), []);
  assert.equal((await customer.rpc('staff_on_task', { task: mine.id })).data.length, 2);
  for (const client of [colleague, unregistered]) {
    assert.deepEqual((await client.rpc('staff_on_task', { task: mine.id })).data, []);
  }
  for (const client of [customer, colleague, unregistered]) {
    for (const table of ['staff', 'organizations', 'task_collaborators']) {
      assert.deepEqual(await read(client, table), [], table);
    }
    assert.deepEqual((await client.rpc('my_tasks')).data, []);
  }
  assert.equal((await anonymous().from('customers').select('*')).error?.code, '42501');
});

test('a Customer changes nothing about the Task and decides nothing about who is on it', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);
  const customer = await customerOf(owner, task);
  const mine = () => customer.from('tasks');

  const renamed = await mine().update({ title: 'Mine now' }).eq('id', task.id).select();
  const closed = await mine().update({ status: 'done' }).eq('id', task.id);
  const kept = await mine().update({ customer_id: await userId(customer) }).eq('id', task.id);
  const opened = await mine().insert({ title: 'Let me in', description: 'Please.' });
  const joined = await addCollaborator(customer, task, owner);

  assert.deepEqual(renamed.data, []);
  for (const refused of [closed, kept, opened, joined]) {
    assert.equal(refused.error?.code, '42501');
  }
});

test('a Customer learns the names of the Staff on their Task, and nothing else about them', async () => {
  const ownerEmail = uniqueEmail('owner');
  const owner = await signInAs(ownerEmail, { staff: {} });
  await owner.from('staff').update({ name: 'Somchai P.' }).eq('email', ownerEmail);
  const collaborator = await staffMember(); // has set no name
  await staffMember(); // not on the Task
  const task = await openTask(owner);
  const other = await openTask(owner);
  await addCollaborator(owner, task, collaborator);
  const customer = await customerOf(owner, task);

  const names = await customer.rpc('staff_on_task', { task: task.id });
  const elsewhere = await customer.rpc('staff_on_task', { task: other.id });
  const asStranger = await (await signInAs(uniqueEmail('stranger'))).rpc('staff_on_task', { task: task.id });

  assert.equal(names.error, null);
  assert.deepEqual(
    names.data.toSorted((a, b) => b.name.localeCompare(a.name)),
    [
      { user_id: await userId(owner), name: 'Somchai P.' },
      { user_id: await userId(collaborator), name: '' },
    ],
  );
  assert.deepEqual(elsewhere.data, []);
  assert.deepEqual(asStranger.data, []);
  assert.equal((await anonymous().rpc('staff_on_task', { task: task.id })).error?.code, '42501');
});

test('any Staff member sets a Customer’s Organization, which need not match their email; nobody else does', async () => {
  const owner = await staffMember();
  const hospital = (await createOrganization(owner)).data.id;
  const task = await openTask(owner);
  const email = uniqueEmail('personal'); // not an address of the hospital
  const customer = await customerOf(owner, task, email);
  const who = { customer: await userId(customer), organization: hospital };
  const recorded = async () => (await owner.from('customers').select('organization_id').eq('email', email).single()).data;

  assert.deepEqual(await recorded(), { organization_id: null });

  const set = await (await staffMember()).rpc('set_customer_organization', who);
  assert.equal(set.error, null);
  assert.deepEqual(await recorded(), { organization_id: hospital });

  for (const client of [customer, await signInAs(uniqueEmail('stranger')), anonymous()]) {
    assert.equal((await client.rpc('set_customer_organization', { ...who, organization: null })).error?.code, '42501');
  }
  assert.equal((await customer.from('customers').update({ organization_id: null }).eq('email', email)).error?.code, '42501');
  assert.deepEqual(await recorded(), { organization_id: hospital });

  assert.equal((await owner.rpc('set_customer_organization', { ...who, organization: null })).error, null);
  assert.deepEqual(await recorded(), { organization_id: null });
});

test('a Customer sets their own language, and nobody else’s', async () => {
  const owner = await staffMember();
  const email = uniqueEmail('customer');
  const otherEmail = uniqueEmail('other');
  const customer = await customerOf(owner, await openTask(owner), email);
  await customerOf(owner, await openTask(owner), otherEmail);

  const mine = await customer.from('customers').update({ language: 'ja' }).eq('email', email).select('language');
  const theirs = await customer.from('customers').update({ language: 'ja' }).eq('email', otherEmail).select();
  const byStaff = await owner.from('customers').update({ language: 'th' }).eq('email', email).select();

  assert.deepEqual(mine.data, [{ language: 'ja' }]);
  assert.deepEqual(theirs.data, []);
  assert.deepEqual(byStaff.data, []);
});

const statusOf = async (client, task) =>
  (await client.from('tasks').select('status').eq('id', task.id).single()).data.status;

test('a Customer comments on the Timeline, and Staff read the comment with the Customer’s email', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);
  const email = uniqueEmail('customer');
  const customer = await customerOf(owner, task, email);

  const posted = await comment(customer, task, 'The printer is still offline.');

  assert.equal(posted.error, null);
  const columns = 'kind, body, author_id, customer:customers(email)';
  const said = { kind: 'comment', body: 'The printer is still offline.', author_id: null, customer: { email } };
  assert.deepEqual((await timeline(customer, task, columns)).at(-1), said);
  assert.deepEqual((await timeline(await staffMember(), task, columns)).at(-1), said);
});

test('a Customer’s comment on an Open Task leaves it Open; the first Staff comment still starts it', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);
  const customer = await customerOf(owner, task);

  await comment(customer, task, 'Any news?');
  const afterCustomer = await statusOf(customer, task);
  await comment(owner, task, 'Looking into it.');

  assert.equal(afterCustomer, 'open');
  assert.equal(await statusOf(customer, task), 'in_progress');
  assert.deepEqual(
    (await timeline(customer, task)).map((entry) => entry.kind),
    ['opened', 'customer_added', 'comment', 'comment', 'moved'],
  );
});

test('a Customer edits their comment within 15 minutes; nobody else edits it and they cannot delete it', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);
  const customer = await customerOf(owner, task);
  const { data: entry } = await comment(customer, task, 'The printer is ofline.');
  const edit = (client, body) => client.from('timeline_entries').update({ body }).eq('id', entry.id).select('body');

  const inTime = await edit(customer, 'The printer is offline.');
  const byOwner = await edit(owner, 'Hijacked');
  const removal = await customer.from('timeline_entries').delete().eq('id', entry.id);
  await admin.from('timeline_entries').update({ created_at: new Date(Date.now() - 16 * 60 * 1000).toISOString() }).eq('id', entry.id);
  const tooLate = await edit(customer, 'Rewritten later.');

  assert.deepEqual(inTime.data, [{ body: 'The printer is offline.' }]);
  assert.deepEqual(byOwner.data, []);
  assert.equal(removal.error?.code, '42501');
  assert.deepEqual(tooLate.data, []);
});

test('a Customer writes nothing but their own comments, on their own Task', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);
  const other = await openTask(owner);
  const customer = await customerOf(owner, task);
  const entries = () => customer.from('timeline_entries');

  const elsewhere = await comment(customer, other);
  const event = await entries().insert({ task_id: task.id, kind: 'moved', status: 'done' });
  const asOwner = await entries().insert({ task_id: task.id, body: 'Hi', author_id: await userId(owner) });
  const blank = await comment(customer, task, ' \n ');

  for (const refused of [elsewhere, event, asOwner]) {
    assert.equal(refused.error?.code, '42501');
  }
  assert.equal(blank.error?.code, '23514');
});

test('a Customer cannot comment on, or edit in, a Task that is Done or Cancelled', async () => {
  const owner = await staffMember();

  for (const closing of ['done', 'cancelled']) {
    const task = await openTask(owner);
    const customer = await customerOf(owner, task);
    const { data: entry } = await comment(customer, task);
    await close(customer, task, closing);

    assert.equal((await comment(customer, task, 'One more thing')).error?.code, '42501');
    const reworded = await customer.from('timeline_entries').update({ body: 'Rewritten' }).eq('id', entry.id).select();
    assert.deepEqual(reworded.data, []);
    assert.equal((await timeline(customer, task)).length, 4);
  }
});

test('a Staff member can be the Customer of a Task: they comment on it, and the comment counts as Staff’s', async () => {
  const owner = await staffMember();
  const email = uniqueEmail('staff');
  const colleague = await signInAs(email, { staff: {} });
  const task = await openTask(owner);

  const added = await addCustomer(owner, task, email);
  const posted = await comment(colleague, task, 'I asked for this one.');

  assert.equal(added.error, null);
  assert.equal(await customerEmail(owner, task), email);
  assert.equal(posted.error, null);
  assert.equal(posted.data.author_id, await userId(colleague));
  assert.equal(posted.data.customer_id, null);
  assert.equal(await statusOf(owner, task), 'in_progress');
});
