import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addCollaborator, addCustomer, anonymous, close, collaborators, comment, createOrganization, customerOf, emailAbout,
  emailOf, emailsTo, move, openTask, reassign, settle, signInAs, staffMember, taskMaster, transfer, uniqueEmail,
  upload, userId,
} from './helpers.mjs';

const details = 'title, description, due_date, organization_id, owner_id, customer_id, earlier_task_id, status';

// The Task numbered `id` as `client` reads it, or null when they do not.
async function read(client, id, columns = details) {
  const { data, error } = await client.from('tasks').select(columns).eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

// The Timeline of the Task numbered `id` as `client` reads it, oldest first.
async function timeline(client, id) {
  const { data, error } = await client
    .from('timeline_entries')
    .select('kind, status, author_id, subject_id, next_task_id')
    .eq('task_id', id)
    .order('id');
  if (error) throw error;
  return data;
}

// Transfers `task` as `client` and returns the Task that carries it on, as that person reads it.
async function transferred(client, task) {
  const { data, error } = await transfer(client, task);
  if (error) throw error;
  return { id: data, ...(await read(client, data)) };
}

test('the Owner transfers a Task: a new Task carries it on with the same details, Owner and Collaborators, and no Customer', async () => {
  const owner = await staffMember();
  const helper = await staffMember();
  const { data: organization } = await createOrganization(owner);
  const task = await openTask(owner, { due_date: '2027-01-31' });
  await owner.from('tasks').update({ organization_id: organization.id }).eq('id', task.id);
  await addCollaborator(owner, task, helper);
  await customerOf(owner, task);
  assert.equal((await comment(owner, task)).error, null); // In progress

  const { data: next, error } = await transfer(owner, task);

  assert.equal(error, null);
  assert.ok(next > task.id);
  assert.deepEqual(await read(owner, next), {
    title: task.title,
    description: task.description,
    due_date: '2027-01-31',
    organization_id: organization.id,
    owner_id: await userId(owner),
    customer_id: null,
    earlier_task_id: task.id,
    status: 'open',
  });
  assert.deepEqual(await collaborators(owner, { id: next }), [await userId(helper)]);
  // Nothing of the old Timeline comes along: the new one says who opened it and who is on it.
  assert.deepEqual(await timeline(owner, next), [
    { kind: 'opened', status: null, author_id: await userId(owner), subject_id: null, next_task_id: null },
    { kind: 'collaborator_added', status: null, author_id: await userId(owner), subject_id: await userId(helper), next_task_id: null },
  ]);
  assert.equal((await read(owner, task.id)).status, 'transferred');
  assert.deepEqual((await timeline(owner, task.id)).at(-1), {
    kind: 'moved', status: 'transferred', author_id: await userId(owner), subject_id: null, next_task_id: next,
  });
});

test('a Task Master transfers a Task of another Owner, who stays the Owner of the new Task', async () => {
  const master = await taskMaster();
  const owner = await staffMember();
  const task = await openTask(owner);

  const next = await transferred(master, task);

  assert.equal(next.owner_id, await userId(owner));
  // The Timeline says who opened the new Task, and for whom.
  assert.deepEqual(await timeline(master, next.id), [
    { kind: 'opened', status: null, author_id: await userId(master), subject_id: await userId(owner), next_task_id: null },
  ]);
  // The Owner goes on as on any Task of theirs.
  assert.equal((await comment(owner, next)).error, null);
  assert.equal((await move(owner, next, 'resolve')).error, null);
});

test('only the Owner and a Task Master transfer a Task', async () => {
  const owner = await staffMember();
  const collaborator = await staffMember();
  const task = await openTask(owner);
  await addCollaborator(owner, task, collaborator);
  const customer = await customerOf(owner, task);

  for (const client of [collaborator, await staffMember(), customer, await signInAs(uniqueEmail('stranger')), anonymous()]) {
    assert.equal((await transfer(client, task)).error?.code, '42501');
  }

  assert.equal((await read(owner, task.id)).status, 'open');
});

test('a Resolved, Done, Cancelled or Transferred Task is not transferred; a Resolved one is Reopened first', async () => {
  const owner = await staffMember();
  const master = await taskMaster();
  const resolved = await openTask(owner);
  await comment(owner, resolved);
  assert.equal((await move(owner, resolved, 'resolve')).error, null);
  const done = await openTask(owner);
  await close(owner, done, 'done');
  const cancelled = await openTask(owner);
  await close(owner, cancelled, 'cancelled');
  const old = await openTask(owner);
  await transferred(owner, old);

  for (const task of [resolved, done, cancelled, old]) {
    for (const client of [owner, master]) {
      assert.equal((await transfer(client, task)).error?.code, '42501');
    }
  }

  assert.equal((await move(master, resolved, 'reopen')).error, null);
  assert.equal((await transfer(owner, resolved)).error, null);
});

test('a Transferred Task takes no comment, file or change', async () => {
  const owner = await staffMember();
  const master = await taskMaster();
  const collaborator = await staffMember();
  const task = await openTask(owner);
  await addCollaborator(owner, task, collaborator);
  const customer = await customerOf(owner, task);
  const { data: said } = await comment(customer, task, 'Please hurry.');
  await transferred(owner, task);

  for (const client of [owner, master, collaborator, customer]) {
    assert.equal((await comment(client, task)).error?.code, '42501');
    assert.notEqual((await upload(client, task)).error, null);
    assert.deepEqual((await client.from('tasks').update({ title: 'Changed' }).eq('id', task.id).select()).data ?? [], []);
    for (const action of ['resolve', 'complete', 'reopen', 'cancel']) {
      assert.equal((await move(client, task, action)).error?.code, '42501');
    }
  }
  for (const client of [owner, master]) {
    assert.equal((await addCollaborator(client, task, await staffMember())).error?.code, '42501');
    const removed = await client.from('task_collaborators').delete().eq('task_id', task.id).select();
    assert.deepEqual(removed.data, []);
    assert.equal((await addCustomer(client, task, uniqueEmail('late'))).error?.context?.status, 403);
  }
  assert.equal((await reassign(master, task, collaborator)).error?.code, '42501');
  // A comment written a moment before is no longer reworded.
  const reworded = await customer.from('timeline_entries').update({ body: 'Never mind.' }).eq('id', said.id).select();
  assert.deepEqual(reworded.data, []);
  assert.equal((await read(owner, task.id)).title, task.title);
});

test('the Customer of the old Task reads it as before, with the number of the new Task, and does not read the new one', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);
  const customer = await customerOf(owner, task);

  const next = await transferred(owner, task);

  assert.equal((await read(customer, task.id)).status, 'transferred');
  assert.equal((await timeline(customer, task.id)).at(-1).next_task_id, next.id);
  assert.equal(await read(customer, next.id), null);
  assert.deepEqual(await timeline(customer, next.id), []);
  assert.equal((await comment(customer, next)).error?.code, '42501');
});

test('a Collaborator who was removed from Staff keeps their place on the new Task', async () => {
  const owner = await staffMember();
  const master = await taskMaster();
  const gone = await staffMember();
  const task = await openTask(owner);
  await addCollaborator(owner, task, gone);
  assert.equal((await master.rpc('remove_staff', { staff_id: await userId(gone) })).error, null);

  const next = await transferred(owner, task);

  assert.deepEqual(await collaborators(owner, next), [await userId(gone)]);
});

test('when a Task Master transfers a Task its Owner and Collaborators get an email about the new Task; the Customer of the old one gets none', async () => {
  const master = await taskMaster();
  const owner = await staffMember();
  const helper = await staffMember();
  const task = await openTask(owner);
  await addCollaborator(owner, task, helper);
  const customer = await customerOf(owner, task);
  const [toOwner, toHelper, toCustomer, actor] = await Promise.all([owner, helper, customer, master].map(emailOf));
  await Promise.all([toHelper, toCustomer].map((to) => emailsTo(to, 1))); // added to the old Task

  const next = await transferred(master, task);

  emailAbout(await emailsTo(toOwner, 1), 'transferred', next, { to: toOwner, actor });
  emailAbout(await emailsTo(toHelper, 2), 'added', next, { to: toHelper, actor });
  await settle();
  assert.equal((await emailsTo(toOwner)).length, 1);
  assert.equal((await emailsTo(toCustomer)).length, 1);
  assert.equal((await emailsTo(actor)).length, 0);
});

test('an Owner who transfers their own Task gets no email, and a Customer added to the new Task gets the usual one', async () => {
  const owner = await staffMember();
  const helper = await staffMember();
  const task = await openTask(owner);
  await addCollaborator(owner, task, helper);
  const [toOwner, toHelper, toCustomer] = [await emailOf(owner), await emailOf(helper), uniqueEmail('customer')];
  await emailsTo(toHelper, 1);

  const next = await transferred(owner, task);
  assert.equal((await addCustomer(owner, next, toCustomer)).error, null);

  emailAbout(await emailsTo(toHelper, 2), 'added', next, { to: toHelper, actor: toOwner });
  emailAbout(await emailsTo(toCustomer, 1), 'added', next, { to: toCustomer, actor: 'PSP' });
  await settle();
  assert.equal((await emailsTo(toOwner)).length, 0);
});
