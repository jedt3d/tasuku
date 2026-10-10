import assert from 'node:assert/strict';
import { test } from 'node:test';
import { write } from '../../supabase/functions/send-emails/emails/index.js';
import {
  addCollaborator, addCustomer, anonymous, close, comment, customerOf, emailsTo, move, openTask, reassign, settle,
  signInAs, staffMember, taskMaster, uniqueEmail, userId,
} from './helpers.mjs';

const emailOf = async (client) => (await client.auth.getUser()).data.user.email;

// `task` as `client` reads it now.
async function read(client, task) {
  const { data, error } = await client.from('tasks').select('owner_id, status, closes_at').eq('id', task.id).single();
  if (error) throw error;
  return data;
}

async function collaborators(client, task) {
  const { data, error } = await client.from('task_collaborators').select('staff_id').eq('task_id', task.id);
  if (error) throw error;
  return data.map((row) => row.staff_id);
}

// The events on the Timeline of `task` after it was opened, oldest first.
async function events(client, task) {
  const { data, error } = await client
    .from('timeline_entries')
    .select('kind, author_id, subject_id')
    .eq('task_id', task.id)
    .neq('kind', 'opened')
    .neq('kind', 'comment')
    .order('id');
  if (error) throw error;
  return data;
}

const removeFromStaff = async (master, staff) => {
  const { error } = await master.rpc('remove_staff', { staff_id: await userId(staff) });
  if (error) throw error;
};

// The one email of `kind` about `task` among `mails`, as the catalogue words it.
function emailAbout(mails, kind, task, values) {
  const expected = write('en', kind, {
    id: task.id, title: task.title, link: `http://localhost:5173/tasks/${task.id}`, ...values,
  });
  const found = mails.filter((mail) => mail.Subject === expected.subject && mail.Text.trim() === expected.text);
  assert.equal(found.length, 1, `one "${kind}" email`);
}

test('a Task Master gives a Task to another Staff member; the previous Owner stays as a Collaborator', async () => {
  const master = await taskMaster();
  const owner = await staffMember();
  const next = await staffMember();
  const task = await openTask(owner);

  const { error } = await reassign(master, task, next);

  assert.equal(error, null);
  assert.equal((await read(master, task)).owner_id, await userId(next));
  assert.deepEqual(await collaborators(master, task), [await userId(owner)]);
  // One event: the Timeline does not also say that the previous Owner was added.
  assert.deepEqual(await events(master, task), [
    { kind: 'owner_changed', author_id: await userId(master), subject_id: await userId(next) },
  ]);
  // The previous Owner still writes on the Task; closing it is now the new Owner's.
  assert.equal((await comment(owner, task)).error, null);
  assert.equal((await move(owner, task, 'resolve')).error?.code, '42501');
  assert.equal((await move(next, task, 'resolve')).error, null);
});

test('a new Owner who was a Collaborator stops being one', async () => {
  const master = await taskMaster();
  const owner = await staffMember();
  const helper = await staffMember();
  const task = await openTask(owner);
  await addCollaborator(owner, task, helper);

  assert.equal((await reassign(master, task, helper)).error, null);

  assert.deepEqual(await collaborators(master, task), [await userId(owner)]);
  assert.deepEqual((await events(master, task)).map((event) => event.kind), ['collaborator_added', 'owner_changed']);
});

test('a Task given back to its first Owner has one Owner and one Collaborator', async () => {
  const master = await taskMaster();
  const owner = await staffMember();
  const next = await staffMember();
  const task = await openTask(owner);

  assert.equal((await reassign(master, task, next)).error, null);
  assert.equal((await reassign(master, task, owner)).error, null);

  assert.equal((await read(master, task)).owner_id, await userId(owner));
  assert.deepEqual(await collaborators(master, task), [await userId(next)]);
  assert.deepEqual(
    (await events(master, task)).map((event) => event.subject_id),
    [await userId(next), await userId(owner)],
  );
});

test('only a Task Master reassigns: the Owner, a Collaborator, other Staff, the Customer and strangers are refused', async () => {
  const master = await taskMaster();
  const owner = await staffMember();
  const helper = await staffMember();
  const next = await staffMember();
  const task = await openTask(owner);
  await addCollaborator(owner, task, helper);
  const customer = await customerOf(owner, task);
  const stranger = await signInAs(uniqueEmail('stranger'));
  const former = await taskMaster();
  await removeFromStaff(master, former);

  for (const client of [owner, helper, next, customer, stranger, former, anonymous()]) {
    assert.equal((await reassign(client, task, next)).error?.code, '42501');
  }
  assert.equal((await read(master, task)).owner_id, await userId(owner));
});

test('the Customer of the Task reads the change of Owner, and the name of the new Owner', async () => {
  const master = await taskMaster();
  const owner = await staffMember();
  const next = await staffMember();
  const { error: named } = await next.from('staff').update({ name: 'Somchai' }).eq('user_id', await userId(next));
  assert.equal(named, null);
  const task = await openTask(owner);
  const customer = await customerOf(owner, task);

  assert.equal((await reassign(master, task, next)).error, null);

  assert.deepEqual((await events(customer, task)).at(-1), {
    kind: 'owner_changed', author_id: await userId(master), subject_id: await userId(next),
  });
  const { data } = await customer.rpc('staff_on_task', { task: task.id });
  assert.ok(data.some((person) => person.name === 'Somchai'));
});

test('a Task in progress or Resolved is reassigned, and a Resolved Task keeps its closing time', async () => {
  const master = await taskMaster();
  const owner = await staffMember();
  const next = await staffMember();
  const task = await openTask(owner);
  await comment(owner, task);
  assert.equal((await reassign(master, task, next)).error, null);
  assert.equal((await move(next, task, 'resolve')).error, null);
  const before = await read(master, task);

  assert.equal((await reassign(master, task, owner)).error, null);

  const after = await read(master, task);
  assert.equal(after.status, 'resolved');
  assert.equal(after.owner_id, await userId(owner));
  assert.equal(after.closes_at, before.closes_at);
});

test('a Done or Cancelled Task is not reassigned', async () => {
  const master = await taskMaster();
  const owner = await staffMember();
  const next = await staffMember();

  for (const status of ['done', 'cancelled']) {
    const task = await openTask(owner);
    await close(owner, task, status);

    assert.equal((await reassign(master, task, next)).error?.code, '42501');
    assert.equal((await read(master, task)).owner_id, await userId(owner));
  }
});

test('the new Owner is Staff who has not been removed and is not the Customer of the Task', async () => {
  const master = await taskMaster();
  const owner = await staffMember();
  const gone = await staffMember();
  await removeFromStaff(master, gone);
  const customerEmail = uniqueEmail('staff');
  const staffCustomer = await signInAs(customerEmail, { staff: {} });
  const outsider = await signInAs(uniqueEmail('stranger'));
  const task = await openTask(owner);
  assert.equal((await addCustomer(owner, task, customerEmail)).error, null);

  for (const person of [gone, staffCustomer, outsider]) {
    assert.equal((await reassign(master, task, person)).error?.code, '42501');
  }
  assert.equal((await master.rpc('reassign_task', { task: task.id, new_owner: null })).error?.code, '42501');
  assert.equal((await read(master, task)).owner_id, await userId(owner));
});

test('a Task Master takes a Task themselves', async () => {
  const master = await taskMaster();
  const owner = await staffMember();
  const task = await openTask(owner);

  assert.equal((await reassign(master, task, master)).error, null);

  assert.equal((await read(master, task)).owner_id, await userId(master));
});

test('giving a Task to the Owner it already has changes nothing', async () => {
  const master = await taskMaster();
  const owner = await staffMember();
  const task = await openTask(owner);

  assert.equal((await reassign(master, task, owner)).error, null);

  assert.deepEqual(await events(master, task), []);
  assert.deepEqual(await collaborators(master, task), []);
});

test('an Owner removed from Staff becomes a Collaborator too, and collaborates once added back', async () => {
  const master = await taskMaster();
  const owner = await staffMember();
  const next = await staffMember();
  const task = await openTask(owner);
  await removeFromStaff(master, owner);

  assert.equal((await reassign(master, task, next)).error, null);

  assert.deepEqual(await collaborators(master, task), [await userId(owner)]);
  assert.equal((await comment(owner, task)).error?.code, '42501');
});

test('a Task Master lists the Tasks a Staff member owns, removed or not', async () => {
  const master = await taskMaster();
  const owner = await staffMember();
  const mine = await openTask(owner);
  const given = await openTask(await staffMember());
  assert.equal((await reassign(master, given, owner)).error, null);
  await openTask(await staffMember());
  await removeFromStaff(master, owner);

  const { data, error } = await master.from('tasks').select('id').eq('owner_id', await userId(owner)).order('id');

  assert.equal(error, null);
  assert.deepEqual(data, [{ id: mine.id }, { id: given.id }]);
});

test('the new Owner and the previous Owner each get an email; the Task Master gets none', async () => {
  const master = await taskMaster();
  const owner = await staffMember();
  const next = await staffMember();
  const task = await openTask(owner);

  assert.equal((await reassign(master, task, next)).error, null);

  const actor = await emailOf(master);
  emailAbout(await emailsTo(await emailOf(next), 1), 'assigned', task, { actor });
  emailAbout(await emailsTo(await emailOf(owner), 1), 'unassigned', task, { actor, owner: await emailOf(next) });
  await settle();
  assert.deepEqual(await emailsTo(actor), []);
  assert.equal((await emailsTo(await emailOf(next))).length, 1);
  assert.equal((await emailsTo(await emailOf(owner))).length, 1);
});

test('a Task Master who takes a Task gets no email, and a previous Owner removed from Staff gets none', async () => {
  const master = await taskMaster();
  const owner = await staffMember();
  const gone = await staffMember();
  const taken = await openTask(owner);
  const orphan = await openTask(gone);
  await removeFromStaff(master, gone);

  assert.equal((await reassign(master, orphan, master)).error, null);
  assert.equal((await reassign(master, taken, master)).error, null);

  const actor = await emailOf(master);
  emailAbout(await emailsTo(await emailOf(owner), 1), 'unassigned', taken, { actor, owner: actor });
  await settle();
  assert.deepEqual(await emailsTo(actor), []);
  assert.deepEqual(await emailsTo(await emailOf(gone)), []);
});
