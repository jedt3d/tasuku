import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addCustomer, anonymous, comment, customerOf, move, openTask, runClosure, staffMember, taskMaster, uniqueEmail,
} from './helpers.mjs';

const read = async (client, task) =>
  (await client.from('tasks').select('status, closes_at').eq('id', task.id).single()).data;
const hoursFromNow = (time) => (new Date(time) - Date.now()) / 3600e3;

// A Task of `owner` that is Resolved, with a Customer unless told otherwise.
async function resolvedTask(owner, { customer = true } = {}) {
  const task = await openTask(owner);
  const person = customer ? await customerOf(owner, task) : null;
  assert.equal((await comment(owner, task)).error, null);
  assert.equal((await move(owner, task, 'resolve')).error, null);
  return { task, customer: person };
}

test('a Task Resolved longer than the closure period becomes Done by itself, and not before', async () => {
  const owner = await staffMember();
  const { task } = await resolvedTask(owner);
  const closesIn = hoursFromNow((await read(owner, task)).closes_at);
  assert.ok(closesIn > 47.9 && closesIn <= 48, `closes in ${closesIn} hours`);

  await runClosure(47);
  assert.equal((await read(owner, task)).status, 'resolved');

  await runClosure(49);
  assert.deepEqual(await read(owner, task), { status: 'done', closes_at: null });
  // Nobody did it: the Timeline shows such an event as Tasuku's.
  const { data } = await owner
    .from('timeline_entries')
    .select('kind, author_id, customer_id')
    .eq('task_id', task.id)
    .eq('status', 'done');
  assert.deepEqual(data, [{ kind: 'moved', author_id: null, customer_id: null }]);
});

test('a Resolved Task with no Customer closes by itself too', async () => {
  const owner = await staffMember();
  const { task } = await resolvedTask(owner, { customer: false });

  await runClosure(49);

  assert.equal((await read(owner, task)).status, 'done');
});

test('a Task Reopened or confirmed before its time is not closed by itself', async () => {
  const owner = await staffMember();
  const reopened = await resolvedTask(owner);
  const confirmed = await resolvedTask(owner);
  assert.equal((await move(reopened.customer, reopened.task, 'reopen')).error, null);
  assert.equal((await move(confirmed.customer, confirmed.task, 'complete')).error, null);

  await runClosure(49);

  assert.deepEqual(await read(owner, reopened.task), { status: 'in_progress', closes_at: null });
  const { data } = await owner.from('timeline_entries').select('id').eq('task_id', confirmed.task.id).eq('status', 'done');
  assert.equal(data.length, 1);
});

test('a Resolved Task takes no Customer until it is Reopened', async () => {
  const owner = await staffMember();
  const master = await taskMaster();
  const { task } = await resolvedTask(owner, { customer: false });
  const email = uniqueEmail('customer');

  for (const client of [owner, master]) {
    assert.equal((await addCustomer(client, task, email)).error?.context?.status, 403);
  }

  assert.equal((await move(master, task, 'reopen')).error, null);
  assert.equal((await addCustomer(owner, task, email)).error, null);
});

test('a Task Master changes the closure period and the reminder lead time; nobody else does', async () => {
  const owner = await staffMember();
  const master = await taskMaster();
  const { task: before, customer } = await resolvedTask(owner);
  const settings = (client) => client.from('settings').select('closure_hours, reminder_hours');
  const change = (client, values) => client.from('settings').update(values).eq('id', true).select('closure_hours, reminder_hours');
  const usual = { closure_hours: 48, reminder_hours: 24 };
  assert.deepEqual((await settings(owner)).data, [usual]);

  try {
    assert.deepEqual((await change(owner, { closure_hours: 1 })).data, []);
    assert.deepEqual((await change(customer, { closure_hours: 1 })).data ?? [], []);
    assert.deepEqual((await settings(customer)).data ?? [], []);
    assert.deepEqual((await settings(anonymous())).data ?? [], []);
    // The lead time is shorter than the period, and at least an hour.
    assert.equal((await change(master, { reminder_hours: 48 })).error?.code, '23514');
    assert.equal((await change(master, { reminder_hours: 0 })).error?.code, '23514');
    assert.equal((await change(master, { closure_hours: 721 })).error?.code, '23514');

    assert.deepEqual((await change(master, { closure_hours: 72, reminder_hours: 12 })).data, [
      { closure_hours: 72, reminder_hours: 12 },
    ]);

    // A Task Resolved from now on has the new period; one already Resolved keeps the time it was given.
    const { task: after } = await resolvedTask(owner);
    assert.ok(hoursFromNow((await read(owner, after)).closes_at) > 71.9);
    assert.ok(hoursFromNow((await read(owner, before)).closes_at) <= 48);
  } finally {
    assert.deepEqual((await change(master, usual)).data, [usual]);
  }
});

test('nobody who is signed in runs automatic closure, so nobody closes Tasks by naming a later time', async () => {
  const owner = await staffMember();
  const master = await taskMaster();
  const { task, customer } = await resolvedTask(owner);
  const as_of = new Date(Date.now() + 49 * 3600e3).toISOString();

  for (const client of [owner, master, customer, anonymous()]) {
    assert.equal((await client.rpc('close_due_tasks', { as_of })).error?.code, '42501');
  }
  assert.equal((await read(owner, task)).status, 'resolved');
});
