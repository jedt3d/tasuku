import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addCollaborator, addCustomer, admin, anonymous, attach, close, comment, customerOf, emailAbout, emailOf, emailsTo, move,
  openTask, removeCustomer, restoreCustomer, runClosure, settle, signInAs, staffMember, taskMaster, uniqueEmail, userId,
} from './helpers.mjs';

const status = (result) => result.error?.context?.status ?? 200;
// What the invite function answers when it refuses.
const refusal = async (result) => (await result.error?.context?.json())?.error ?? null;

// The ids of the Tasks `client` reads.
const tasksOf = async (client) => (await client.from('tasks').select('id').order('id')).data.map((task) => task.id);
const statusOf = async (client, task) => (await client.from('tasks').select('status').eq('id', task.id).single()).data.status;

// The record of the Customer signed in as `customer`, as `client` reads it, or null.
async function record(client, customer) {
  const { data, error } = await client
    .from('customers')
    .select('email, removed_at, removed_by')
    .eq('user_id', await userId(customer))
    .maybeSingle();
  if (error) throw error;
  return data;
}

// The Timeline of `task` as `client` reads it, oldest first.
async function timeline(client, task) {
  const { data, error } = await client
    .from('timeline_entries')
    .select('kind, status, author_id, customer_id, body, customer:customers(email)')
    .eq('task_id', task.id)
    .order('id');
  if (error) throw error;
  return data;
}

// A Staff member whose email is the Customer of a new Task of `owner`, which is In progress.
async function staffAsCustomer(owner) {
  const email = uniqueEmail('staff');
  const colleague = await signInAs(email, { staff: {} });
  const task = await openTask(owner);
  assert.equal((await addCustomer(owner, task, email)).error, null);
  assert.equal((await comment(owner, task)).error, null);
  return { colleague, email, task };
}

test('a Task Master removes any Customer; an Owner removes a Customer on a Task they own; nobody else does', async () => {
  const master = await taskMaster();
  const owner = await staffMember();
  const collaborator = await staffMember();
  const task = await openTask(owner);
  await addCollaborator(owner, task, collaborator);
  const customer = await customerOf(owner, task);
  const other = await customerOf(owner, await openTask(owner));
  // An Owner, but of a Task this Customer is not on.
  const elsewhere = await staffMember();
  await customerOf(elsewhere, await openTask(elsewhere));

  for (const client of [collaborator, elsewhere, customer, other, await signInAs(uniqueEmail('stranger')), anonymous()]) {
    assert.equal((await removeCustomer(client, customer)).error?.code, '42501');
  }
  assert.equal((await record(owner, customer)).removed_at, null);
  assert.deepEqual(await tasksOf(customer), [task.id]);

  assert.equal((await removeCustomer(owner, customer)).error, null);
  assert.equal((await removeCustomer(master, other)).error, null);

  const removed = await record(master, customer);
  assert.notEqual(removed.removed_at, null);
  assert.equal(removed.removed_by, await userId(owner));
  assert.equal((await record(master, other)).removed_by, await userId(master));
  // Removing again changes nothing, and not who did it.
  assert.equal((await removeCustomer(master, customer)).error, null);
  assert.deepEqual(await record(master, customer), removed);
});

test('an Owner removes a Customer of a Task they own in any status', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);
  const customer = await customerOf(owner, task);
  await close(owner, task, 'cancelled');

  assert.equal((await removeCustomer(owner, customer)).error, null);
  assert.notEqual((await record(owner, customer)).removed_at, null);
});

test('a removed Customer reads nothing and writes nothing, in a session that was already open', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);
  const customer = await customerOf(owner, task);
  assert.equal((await comment(owner, task)).error, null);
  const written = await comment(customer, task, 'Thank you.');
  assert.equal(written.error, null);
  assert.equal((await attach(owner, task)).error, null);

  assert.equal((await removeCustomer(owner, customer)).error, null);

  assert.deepEqual(await tasksOf(customer), []);
  assert.deepEqual(await timeline(customer, task), []);
  assert.deepEqual((await customer.from('attachments').select('id')).data, []);
  assert.deepEqual((await customer.rpc('staff_on_task', { task: task.id })).data, []);
  assert.equal(await record(customer, customer), null);
  assert.notEqual((await comment(customer, task)).error, null);
  const edited = await customer.from('timeline_entries').update({ body: 'Changed.' }).eq('id', written.data.id).select();
  assert.deepEqual(edited.data, []);
  for (const action of ['complete', 'cancel']) {
    assert.equal((await move(customer, task, action)).error?.code, '42501');
  }
  const language = await customer.from('customers').update({ language: 'th' }).eq('user_id', await userId(customer)).select();
  assert.deepEqual(language.data, []);
});

test('the Tasks of a removed Customer keep their status, their Timeline and the Customer’s name on it', async () => {
  const owner = await staffMember();
  const email = uniqueEmail('customer');
  const task = await openTask(owner);
  const customer = await customerOf(owner, task, email);
  assert.equal((await comment(owner, task)).error, null);
  assert.equal((await comment(customer, task, 'Thank you.')).error, null);
  const before = await timeline(owner, task);

  assert.equal((await removeCustomer(owner, customer)).error, null);

  assert.equal(await statusOf(owner, task), 'in_progress');
  assert.deepEqual(await timeline(owner, task), before);
  assert.deepEqual(before.at(-1).customer, { email });
  // The Owner still decides what becomes of the Task.
  assert.equal((await move(owner, task, 'cancel')).error, null);
});

test('a removed Customer is not added to a Task until a Task Master gives the access back', async () => {
  const master = await taskMaster();
  const owner = await staffMember();
  const email = uniqueEmail('customer');
  const first = await openTask(owner);
  const customer = await customerOf(owner, first, email);
  assert.equal((await removeCustomer(owner, customer)).error, null);
  const next = await openTask(owner);

  for (const client of [owner, master]) {
    const refused = await addCustomer(client, next, email);
    assert.equal(status(refused), 403);
    assert.equal(await refusal(refused), 'customer_removed');
    assert.equal((await client.rpc('set_customer', { task: next.id, customer_email: email })).error?.code, 'TSK03');
  }
  // Someone who does not choose this Task's Customer is not told why.
  const outsider = await addCustomer(await staffMember(), next, email);
  assert.equal(await refusal(outsider), 'not_allowed');

  const collaborator = await staffMember();
  await addCollaborator(owner, first, collaborator);
  for (const client of [owner, collaborator, await staffMember(), customer, await signInAs(uniqueEmail('stranger')), anonymous()]) {
    assert.equal((await restoreCustomer(client, customer)).error?.code, '42501');
  }
  assert.deepEqual(await tasksOf(customer), []);

  assert.equal((await restoreCustomer(master, customer)).error, null);

  assert.deepEqual(await record(master, customer), { email, removed_at: null, removed_by: null });
  assert.deepEqual(await tasksOf(customer), [first.id]);
  assert.equal((await comment(customer, first, 'Back again.')).error, null);
  assert.equal((await addCustomer(owner, next, email)).error, null);
  assert.deepEqual(await tasksOf(customer), [first.id, next.id]);
});

test('a removed Customer gets no email, and nobody is told of the removal', async () => {
  const owner = await staffMember();
  const helper = await staffMember();
  const task = await openTask(owner);
  await addCollaborator(owner, task, helper);
  const [toHelper, toCustomer, toOwner] = [await emailOf(helper), uniqueEmail('customer'), await emailOf(owner)];
  const customer = await customerOf(owner, task, toCustomer);
  await Promise.all([toHelper, toCustomer].map((to) => emailsTo(to, 1)));

  assert.equal((await removeCustomer(owner, customer)).error, null);
  assert.equal((await comment(owner, task)).error, null);

  emailAbout(await emailsTo(toHelper, 2), 'comment', task, { to: toHelper, actor: toOwner });
  await settle();
  assert.equal((await emailsTo(toCustomer)).length, 1);
  assert.equal((await emailsTo(toOwner)).length, 0);
});

test('a Resolved Task of a removed Customer becomes Done by itself, with no reminder and no email', async () => {
  const master = await taskMaster();
  const owner = await staffMember();
  const task = await openTask(owner);
  const toCustomer = uniqueEmail('customer');
  const customer = await customerOf(owner, task, toCustomer);
  assert.equal((await comment(owner, task)).error, null);
  await emailsTo(toCustomer, 2);
  assert.equal((await removeCustomer(owner, customer)).error, null);
  assert.equal((await move(owner, task, 'resolve')).error, null);

  // Nobody is there to confirm: the Owner still does not confirm their own proposal.
  assert.equal((await move(customer, task, 'reopen')).error?.code, '42501');
  assert.equal((await move(owner, task, 'complete')).error?.code, '42501');
  await runClosure(25);
  assert.equal(await statusOf(owner, task), 'resolved');
  await runClosure(49);

  assert.equal(await statusOf(owner, task), 'done');
  await settle(1500);
  assert.equal((await emailsTo(toCustomer)).length, 2);
  assert.equal((await emailsTo(await emailOf(owner))).length, 0);
  // A Task Master answers a Resolved Task as before.
  const other = await openTask(owner);
  const gone = await customerOf(owner, other);
  assert.equal((await comment(owner, other)).error, null);
  assert.equal((await move(owner, other, 'resolve')).error, null);
  assert.equal((await removeCustomer(owner, gone)).error, null);
  assert.equal((await move(master, other, 'reopen')).error, null);
});

test('removing a Customer who is also Staff closes their unfinished Tasks with the status the Task Master chose', async () => {
  const master = await taskMaster();
  const owner = await staffMember();
  const { colleague, email, task: inProgress } = await staffAsCustomer(owner);
  const open = await openTask(owner);
  const resolved = await openTask(owner);
  const done = await openTask(owner);
  for (const task of [open, resolved, done]) assert.equal((await addCustomer(owner, task, email)).error, null);
  assert.equal((await comment(owner, resolved)).error, null);
  assert.equal((await move(owner, resolved, 'resolve')).error, null);
  await close(colleague, done, 'done');
  const length = (await timeline(owner, done)).length;

  assert.equal((await removeCustomer(master, colleague, 'cancelled')).error, null);

  assert.equal(await statusOf(owner, open), 'cancelled');
  assert.equal(await statusOf(owner, inProgress), 'cancelled');
  // A Resolved Task is not cancelled: it becomes Done, as it would have by itself.
  assert.equal(await statusOf(owner, resolved), 'done');
  assert.equal((await timeline(owner, done)).length, length);
  const last = (await timeline(owner, open)).at(-1);
  assert.deepEqual(
    { kind: last.kind, status: last.status, author_id: last.author_id, customer_id: last.customer_id },
    { kind: 'moved', status: 'cancelled', author_id: await userId(master), customer_id: null },
  );
  assert.notEqual((await record(master, colleague)).removed_at, null);
  // Not affected as Staff: they read Tasks and open their own.
  assert.ok((await tasksOf(colleague)).includes(open.id));
  assert.ok((await openTask(colleague)).id);
});

test('a Customer who is also Staff is removed by a Task Master only, and not without a final status', async () => {
  const master = await taskMaster();
  const owner = await staffMember();
  const { colleague, task } = await staffAsCustomer(owner);

  assert.equal((await removeCustomer(owner, colleague, 'cancelled')).error?.code, '42501');
  assert.equal((await removeCustomer(master, colleague)).error?.code, 'TSK04');
  assert.equal((await removeCustomer(master, colleague, 'transferred')).error?.code, 'TSK04');
  assert.equal(await statusOf(owner, task), 'in_progress');
  assert.equal((await record(master, colleague)).removed_at, null);
  assert.equal((await move(colleague, task, 'complete')).error, null);

  // Nothing is left to close, so there is nothing to choose.
  assert.equal((await removeCustomer(master, colleague)).error, null);
  assert.notEqual((await record(master, colleague)).removed_at, null);
});

test('a Staff member removed as a Customer no longer acts as the Customer of any Task', async () => {
  const master = await taskMaster();
  const owner = await staffMember();
  const task = await openTask(owner);
  const email = uniqueEmail('later-staff');
  const person = await customerOf(owner, task, email);
  assert.equal((await comment(owner, task)).error, null);
  assert.equal((await removeCustomer(owner, person)).error, null);
  // Arranged: the removed Customer becomes Staff afterwards, with a Task still unfinished.
  assert.equal((await admin.rpc('register_staff', { staff_email: email })).error, null);

  assert.ok((await tasksOf(person)).includes(task.id));
  assert.notEqual((await comment(person, task)).error, null);
  for (const action of ['complete', 'cancel']) {
    assert.equal((await move(person, task, action)).error?.code, '42501');
  }
  assert.equal((await restoreCustomer(master, person)).error, null);
  assert.equal((await move(person, task, 'complete')).error, null);
});

test('a Staff member removed from Staff is removed as a Customer too, and their Tasks stay as they are', async () => {
  const master = await taskMaster();
  const owner = await staffMember();
  const { colleague, email, task } = await staffAsCustomer(owner);

  assert.equal((await master.rpc('remove_staff', { staff_id: await userId(colleague) })).error, null);

  assert.equal((await record(master, colleague)).removed_by, await userId(master));
  assert.equal(await statusOf(owner, task), 'in_progress');
  assert.deepEqual(await tasksOf(colleague), []);
  assert.equal((await move(colleague, task, 'complete')).error?.code, '42501');
  // Coming back as Staff does not give the Customer's access back: a Task Master does that.
  assert.equal((await admin.rpc('register_staff', { staff_email: email })).error, null);
  assert.equal((await move(colleague, task, 'complete')).error?.code, '42501');
  assert.equal((await restoreCustomer(master, colleague)).error, null);
  assert.equal((await move(colleague, task, 'complete')).error, null);
});

test('removing or restoring someone who is no Customer is refused', async () => {
  const master = await taskMaster();
  const nobody = await signInAs(uniqueEmail('stranger'));

  assert.equal((await removeCustomer(master, nobody)).error?.code, 'P0002');
  assert.equal((await restoreCustomer(master, nobody)).error?.code, 'P0002');
});
