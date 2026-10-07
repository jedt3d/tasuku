import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addCollaborator,
  admin,
  anonymous,
  comment,
  openTask,
  signInAs,
  staffMember,
  taskMaster,
  uniqueEmail,
  userId,
} from './helpers.mjs';

// Who collaborates on `task`, as `client` reads it.
async function collaborators(client, task) {
  const { data, error } = await client.from('task_collaborators').select('staff_id').eq('task_id', task.id);
  if (error) throw error;
  return data.map((row) => row.staff_id);
}

const removeCollaborator = async (client, task, staff) =>
  client.from('task_collaborators').delete().eq('task_id', task.id).eq('staff_id', await userId(staff)).select();

test('the Owner adds a Collaborator, and every Staff member reads who is on the Task', async () => {
  const owner = await staffMember();
  const email = uniqueEmail('collaborator');
  const collaborator = await signInAs(email, { staff: {} });
  const task = await openTask(owner);

  const added = await addCollaborator(owner, task, collaborator);

  assert.equal(added.error, null);
  const { data } = await (await staffMember())
    .from('task_collaborators')
    .select('staff:staff(name, email)')
    .eq('task_id', task.id);
  assert.deepEqual(data, [{ staff: { name: '', email } }]);
});

test('a Collaborator comments on the Timeline, edits their comment and edits the details of the Task', async () => {
  const owner = await staffMember();
  const collaborator = await staffMember();
  const task = await openTask(owner);
  await addCollaborator(owner, task, collaborator);

  const posted = await comment(collaborator, task, 'I can take the server room.');
  const reworded = await collaborator
    .from('timeline_entries')
    .update({ body: 'I can take the server room today.' })
    .eq('id', posted.data.id)
    .select('body');
  const edited = await collaborator.from('tasks').update({ due_date: '2026-12-01' }).eq('id', task.id).select('due_date');

  assert.equal(posted.error, null);
  assert.deepEqual(reworded.data, [{ body: 'I can take the server room today.' }]);
  assert.deepEqual(edited.data, [{ due_date: '2026-12-01' }]);
});

test('the Owner removes a Collaborator, who can then no longer write on the Task', async () => {
  const owner = await staffMember();
  const collaborator = await staffMember();
  const task = await openTask(owner);
  await addCollaborator(owner, task, collaborator);

  const removed = await removeCollaborator(owner, task, collaborator);

  assert.equal(removed.data.length, 1);
  assert.deepEqual(await collaborators(owner, task), []);
  assert.equal((await comment(collaborator, task)).error?.code, '42501');
  assert.deepEqual((await collaborator.from('tasks').update({ title: 'Mine' }).eq('id', task.id).select()).data, []);
});

test('a Task Master adds and removes a Collaborator on any Task', async () => {
  const task = await openTask(await staffMember());
  const collaborator = await staffMember();
  const master = await taskMaster();

  const added = await addCollaborator(master, task, collaborator);
  const onTask = await collaborators(master, task);
  const removed = await removeCollaborator(master, task, collaborator);

  assert.equal(added.error, null);
  assert.deepEqual(onTask, [await userId(collaborator)]);
  assert.equal(removed.data.length, 1);
  assert.deepEqual(await collaborators(master, task), []);
});

test('a Collaborator and Staff who are not on the Task decide nothing about who is on it', async () => {
  const owner = await staffMember();
  const collaborator = await staffMember();
  const reader = await staffMember();
  const task = await openTask(owner);
  await addCollaborator(owner, task, collaborator);

  for (const client of [collaborator, reader]) {
    assert.equal((await addCollaborator(client, task, reader)).error?.code, '42501');
    assert.deepEqual((await removeCollaborator(client, task, collaborator)).data, []);
  }
  assert.deepEqual(await collaborators(owner, task), [await userId(collaborator)]);
});

test('a Collaborator cannot change the Owner or the status of the Task', async () => {
  const owner = await staffMember();
  const collaborator = await staffMember();
  const task = await openTask(owner);
  await addCollaborator(owner, task, collaborator);

  const handover = await collaborator.from('tasks').update({ owner_id: await userId(collaborator) }).eq('id', task.id);
  const closing = await collaborator.from('tasks').update({ status: 'resolved' }).eq('id', task.id);

  assert.equal(handover.error?.code, '42501');
  assert.equal(closing.error?.code, '42501');
  const { data } = await owner.from('tasks').select('status, owner_id').eq('id', task.id).single();
  assert.deepEqual(data, { status: 'open', owner_id: await userId(owner) });
});

test('adding and removing a Collaborator appear on the Timeline, with who did it and to whom', async () => {
  const owner = await staffMember();
  const collaborator = await staffMember();
  const master = await taskMaster();
  const task = await openTask(owner);

  await addCollaborator(owner, task, collaborator);
  await removeCollaborator(master, task, collaborator);

  const { data } = await collaborator
    .from('timeline_entries')
    .select('kind, author_id, subject_id, body, status')
    .eq('task_id', task.id)
    .order('created_at')
    .order('id');
  const about = { subject_id: await userId(collaborator), body: null, status: null };
  assert.deepEqual(data.slice(1), [
    { kind: 'collaborator_added', author_id: await userId(owner), ...about },
    { kind: 'collaborator_removed', author_id: await userId(master), ...about },
  ]);
});

test('nobody writes a Collaborator event through the API', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);

  const forged = await owner
    .from('timeline_entries')
    .insert({ task_id: task.id, kind: 'collaborator_added', subject_id: await userId(owner) });

  assert.equal(forged.error?.code, '42501');
});

test('only Staff who are not already on the Task can be added to it', async () => {
  const email = uniqueEmail('leaver');
  const owner = await staffMember();
  const collaborator = await staffMember();
  const leaver = await signInAs(email, { staff: {} });
  const stranger = await signInAs(uniqueEmail('stranger'));
  const task = await openTask(owner);
  await admin.from('staff').update({ removed_at: new Date().toISOString() }).eq('email', email);
  await addCollaborator(owner, task, collaborator);

  assert.equal((await addCollaborator(owner, task, owner)).error?.code, '42501');
  assert.equal((await addCollaborator(owner, task, leaver)).error?.code, '42501');
  assert.equal((await addCollaborator(owner, task, stranger)).error?.code, '42501');
  assert.equal((await addCollaborator(owner, task, collaborator)).error?.code, '23505');
  assert.deepEqual(await collaborators(owner, task), [await userId(collaborator)]);
});

test('nobody adds or removes a Collaborator on a Task that is Done or Cancelled', async () => {
  const owner = await staffMember();
  const collaborator = await staffMember();
  const other = await staffMember();
  const master = await taskMaster();

  for (const status of ['done', 'cancelled']) {
    const task = await openTask(owner);
    await addCollaborator(owner, task, collaborator);
    await admin.from('tasks').update({ status }).eq('id', task.id);

    for (const client of [owner, master]) {
      assert.equal((await addCollaborator(client, task, other)).error?.code, '42501');
      assert.deepEqual((await removeCollaborator(client, task, collaborator)).data, []);
    }
    assert.equal((await comment(collaborator, task)).error?.code, '42501');
    assert.deepEqual((await collaborator.from('tasks').update({ title: 'Rewritten' }).eq('id', task.id).select()).data, []);
  }
});

test('a Staff member lists the Tasks they are part of: the ones they own and the ones they collaborate on', async () => {
  const me = await staffMember();
  const other = await staffMember();
  const mine = await openTask(me);
  const shared = await openTask(other);
  const left = await openTask(other);
  await openTask(other);
  await addCollaborator(other, shared, me);
  await addCollaborator(other, left, me);
  await removeCollaborator(other, left, me);
  await comment(me, shared);

  const all = await me.rpc('my_tasks').select('id, owner:staff!owner_id(email)').order('id');
  const started = await me.rpc('my_tasks').select('id').eq('status', 'in_progress');

  assert.equal(all.error, null);
  assert.deepEqual(all.data.map((task) => task.id), [mine.id, shared.id]);
  assert.equal(typeof all.data[0].owner.email, 'string');
  assert.deepEqual(started.data, [{ id: shared.id }]);
});

test('a user who is not Staff reads no Collaborators and is part of no Task', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);
  await addCollaborator(owner, task, await staffMember());
  const stranger = await signInAs(uniqueEmail('stranger'));

  assert.deepEqual(await collaborators(stranger, task), []);
  assert.equal((await addCollaborator(stranger, task, stranger)).error?.code, '42501');
  assert.deepEqual((await stranger.rpc('my_tasks')).data, []);
  assert.equal((await anonymous().from('task_collaborators').select('*')).error?.code, '42501');
  assert.equal((await anonymous().rpc('my_tasks')).error?.code, '42501');
});

test('a removed Staff member no longer writes on the Task they collaborate on, nor reads who is on it', async () => {
  const email = uniqueEmail('leaver');
  const owner = await staffMember();
  const leaver = await signInAs(email, { staff: {} });
  const task = await openTask(owner);
  await addCollaborator(owner, task, leaver);
  await admin.from('staff').update({ removed_at: new Date().toISOString() }).eq('email', email);

  assert.equal((await comment(leaver, task)).error?.code, '42501');
  assert.deepEqual(await collaborators(leaver, task), []);
  assert.deepEqual((await leaver.rpc('my_tasks')).data, []);
});
