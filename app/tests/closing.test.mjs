import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import {
  addCollaborator,
  addCustomer,
  anonymous,
  comment,
  customerOf,
  move,
  openTask,
  signInAs,
  staffMember,
  taskMaster,
  uniqueEmail,
  userId,
} from './helpers.mjs';

const actions = { resolve: 'resolved', complete: 'done', reopen: 'in_progress', cancel: 'cancelled' };

// The same people throughout; every attempt that could succeed gets a Task of its own.
const people = {};
let customerEmail;

before(async () => {
  people.owner = await staffMember();
  people.collaborator = await staffMember();
  people.outsider = await staffMember();
  people.master = await taskMaster();
  customerEmail = uniqueEmail('customer');
  people.customer = await customerOf(people.owner, await openTask(people.owner), customerEmail);
  // The Customer of some other Task.
  people.stranger = await customerOf(people.owner, await openTask(people.owner));
});

const statusOf = async (task) =>
  (await people.owner.from('tasks').select('status').eq('id', task.id).single()).data.status;

// A Task of the Owner in `status`, with the Collaborator on it and, unless told otherwise, the Customer.
async function taskIn(status, { customer = true } = {}) {
  const { owner, collaborator, master } = people;
  const task = await openTask(owner);
  await addCollaborator(owner, task, collaborator);
  if (customer) await addCustomer(owner, task, customerEmail);
  if (status !== 'open') await comment(owner, task);
  if (status === 'resolved' || status === 'done') await move(owner, task, 'resolve');
  if (status === 'done') await move(master, task, 'complete');
  if (status === 'cancelled') await move(owner, task, 'cancel');
  assert.equal(await statusOf(task), status);
  return task;
}

// Attempts `action` on a Task in `status` as every role, and expects only `allowed` to succeed.
async function attempt(status, action, allowed, options) {
  let task;
  for (const role of Object.keys(people)) {
    task ??= await taskIn(status, options);
    const { error } = await move(people[role], task, action);
    const label = `${role} ${action} from ${status}`;

    if (allowed.includes(role)) {
      assert.equal(error, null, label);
      assert.equal(await statusOf(task), actions[action], label);
      task = null;
    } else {
      assert.equal(error?.code, '42501', label);
      assert.equal(await statusOf(task), status, label);
    }
  }
}

test('only the Owner and a Task Master move a Task in progress to Resolved', async () => {
  await attempt('open', 'resolve', []);
  await attempt('in_progress', 'resolve', ['owner', 'master']);
  await attempt('resolved', 'resolve', []);
});

test('the Customer marks their Task Done at any time; a Task Master confirms a Resolved one', async () => {
  await attempt('open', 'complete', ['customer']);
  await attempt('in_progress', 'complete', ['customer']);
  await attempt('resolved', 'complete', ['customer', 'master']);
});

test('the Owner of a Task with no Customer marks it Done alone', async () => {
  await attempt('open', 'complete', ['owner'], { customer: false });
  await attempt('in_progress', 'complete', ['owner'], { customer: false });
  await attempt('resolved', 'complete', ['owner', 'master'], { customer: false });
});

test('the Customer and a Task Master Reopen a Resolved Task, back to In progress', async () => {
  await attempt('open', 'reopen', []);
  await attempt('in_progress', 'reopen', []);
  await attempt('resolved', 'reopen', ['customer', 'master']);
});

test('the Customer, the Owner and a Task Master cancel a Task, but not a Resolved one', async () => {
  await attempt('open', 'cancel', ['customer', 'owner', 'master']);
  await attempt('in_progress', 'cancel', ['customer', 'owner', 'master']);
  await attempt('resolved', 'cancel', []);
});

test('no transition leaves Done or Cancelled', async () => {
  for (const status of ['done', 'cancelled']) {
    for (const action of Object.keys(actions)) {
      await attempt(status, action, []);
    }
  }
});

test('a signed-out visitor moves nothing, and a Task that does not exist is refused', async () => {
  const task = await taskIn('in_progress');

  for (const action of Object.keys(actions)) {
    assert.equal((await move(anonymous(), task, action)).error?.code, '42501');
    assert.equal((await move(people.master, { id: 2 ** 40 }, action)).error?.code, '42501');
  }
  assert.equal(await statusOf(task), 'in_progress');
});

test('every transition is on the Timeline, naming the Staff member or the Customer who made it', async () => {
  const { owner, customer, master } = people;
  const task = await taskIn('in_progress');
  await move(owner, task, 'resolve');
  await move(customer, task, 'reopen');
  await move(owner, task, 'resolve');
  await move(master, task, 'complete');

  const read = (client) =>
    client
      .from('timeline_entries')
      .select('status, author_id, customer_id')
      .eq('task_id', task.id)
      .eq('kind', 'moved')
      .order('id');
  const [ownerId, customerId, masterId] = await Promise.all([owner, customer, master].map(userId));

  const { data } = await read(customer);
  assert.deepEqual(data, [
    { status: 'in_progress', author_id: null, customer_id: null },
    { status: 'resolved', author_id: ownerId, customer_id: null },
    { status: 'in_progress', author_id: null, customer_id: customerId },
    { status: 'resolved', author_id: ownerId, customer_id: null },
    { status: 'done', author_id: masterId, customer_id: null },
  ]);
  assert.deepEqual((await read(owner)).data, data);
});

test('a Staff member who is the Customer of a Task confirms it, as Staff', async () => {
  const email = uniqueEmail('staff');
  const colleague = await signInAs(email, { staff: {} });
  // The Customer is on the Task before it is Resolved: none is added while it is (#11).
  const task = await taskIn('in_progress', { customer: false });
  assert.equal((await addCustomer(people.owner, task, email)).error, null);
  assert.equal((await move(people.owner, task, 'resolve')).error, null);

  assert.equal((await move(people.owner, task, 'complete')).error?.code, '42501');
  assert.equal((await move(colleague, task, 'resolve')).error?.code, '42501');
  assert.equal((await move(colleague, task, 'complete')).error, null);

  const { data } = await people.owner
    .from('timeline_entries')
    .select('author_id, customer_id')
    .eq('task_id', task.id)
    .eq('status', 'done')
    .single();
  assert.deepEqual(data, { author_id: await userId(colleague), customer_id: null });
});

test('an Owner who is also the Customer of their Task does not confirm their own proposal', async () => {
  const email = uniqueEmail('staff');
  const owner = await signInAs(email, { staff: {} });
  const resolved = async () => {
    const task = await openTask(owner);
    await addCustomer(owner, task, email);
    await comment(owner, task);
    await move(owner, task, 'resolve');
    return task;
  };

  const task = await resolved();
  assert.equal((await move(owner, task, 'complete')).error?.code, '42501');
  assert.equal((await move(owner, task, 'reopen')).error?.code, '42501');
  assert.equal(await statusOf(task), 'resolved');
  assert.equal((await move(people.master, task, 'complete')).error, null);
});

test('a new Task refers to an earlier one, and whoever writes on it changes that', async () => {
  const { owner, collaborator, outsider, customer } = people;
  const first = await taskIn('done');
  const second = await openTask(owner);
  const task = await openTask(owner, { earlier_task_id: first.id });
  await addCollaborator(owner, task, collaborator);
  await addCustomer(owner, task, customerEmail);
  const refer = (client, earlier) =>
    client.from('tasks').update({ earlier_task_id: earlier }).eq('id', task.id).select('earlier_task_id');

  assert.equal(task.earlier_task_id, first.id);
  assert.deepEqual((await refer(collaborator, second.id)).data, [{ earlier_task_id: second.id }]);
  assert.deepEqual((await refer(owner, null)).data, [{ earlier_task_id: null }]);
  assert.deepEqual((await refer(outsider, first.id)).data, []);
  assert.deepEqual((await refer(customer, first.id)).data, []);
  assert.equal((await refer(owner, task.id)).error?.code, '23514');
  assert.equal((await refer(owner, 2 ** 40)).error?.code, '23514');
  assert.equal((await openTask(owner, { earlier_task_id: 2 ** 40 }).catch((error) => error)).code, '23514');
});
