import assert from 'node:assert/strict';
import { test } from 'node:test';
import { admin, anonymous, comment, openTask as open, signInAs, staffMember, uniqueEmail, userId } from './helpers.mjs';

test('a Staff member opens a Task: they are its Owner and it starts as Open', async () => {
  const me = await staffMember();

  const task = await open(me);

  assert.equal(task.status, 'open');
  assert.equal(task.owner_id, await userId(me));
  assert.equal(task.due_date, null);
  assert.equal(typeof task.id, 'number');
});

test('a Task can be opened with a due date', async () => {
  const task = await open(await staffMember(), { due_date: '2026-11-30' });

  assert.equal(task.due_date, '2026-11-30');
});

test('a Task needs a title and a description', async () => {
  const me = await staffMember();

  const noTitle = await me.from('tasks').insert({ title: '  ', description: 'Something' });
  const noDescription = await me.from('tasks').insert({ title: 'Something', description: '' });

  assert.equal(noTitle.error?.code, '23514');
  assert.equal(noDescription.error?.code, '23514');
});

test('the status and the Owner cannot be chosen when opening a Task', async () => {
  const me = await staffMember();
  const other = await userId(await staffMember());
  const fields = { title: 'Mine to give away?', description: 'No.' };

  const status = await me.from('tasks').insert({ ...fields, status: 'done' });
  const owner = await me.from('tasks').insert({ ...fields, owner_id: other });

  assert.equal(status.error?.code, '42501');
  assert.equal(owner.error?.code, '42501');
});

test('every Staff member reads a Task, with its Owner’s name', async () => {
  const ownerEmail = uniqueEmail('owner');
  const owner = await signInAs(ownerEmail, { staff: {} });
  await owner.from('staff').update({ name: 'Somchai P.' }).eq('email', ownerEmail);
  const task = await open(owner);
  const reader = await staffMember();

  const { data, error } = await reader
    .from('tasks')
    .select('title, status, owner:staff!owner_id(name, email)')
    .eq('id', task.id);

  assert.equal(error, null);
  assert.deepEqual(data, [
    { title: task.title, status: 'open', owner: { name: 'Somchai P.', email: ownerEmail } },
  ]);
});

test('a Staff member who is not the Owner cannot change the Task', async () => {
  const task = await open(await staffMember());
  const other = await staffMember();

  const { data } = await other.from('tasks').update({ title: 'Hijacked' }).eq('id', task.id).select();
  const removal = await other.from('tasks').delete().eq('id', task.id);

  assert.deepEqual(data, []);
  assert.equal(removal.error?.code, '42501');
});

test('the Owner changes the title, the description and the due date', async () => {
  const owner = await staffMember();
  const task = await open(owner);
  const changes = { title: 'Replace both UPS batteries', description: 'Racks 2 and 3.', due_date: '2026-12-01' };

  const { data, error } = await owner
    .from('tasks')
    .update(changes)
    .eq('id', task.id)
    .select('title, description, due_date');

  assert.equal(error, null);
  assert.deepEqual(data, [changes]);
});

test('a Task Master changes the details of any Task', async () => {
  const task = await open(await staffMember());
  const taskMaster = await signInAs(uniqueEmail('tm'), { staff: { taskMaster: true } });

  const { data } = await taskMaster.from('tasks').update({ due_date: null }).eq('id', task.id).select('id');

  assert.deepEqual(data, [{ id: task.id }]);
});

test('nobody writes the status, the Owner or deletes a Task through the API', async () => {
  const owner = await staffMember();
  const task = await open(owner);
  const taskMaster = await signInAs(uniqueEmail('tm'), { staff: { taskMaster: true } });

  for (const client of [owner, taskMaster]) {
    const status = await client.from('tasks').update({ status: 'done' }).eq('id', task.id);
    const handover = await client.from('tasks').update({ owner_id: await userId(taskMaster) }).eq('id', task.id);
    const removal = await client.from('tasks').delete().eq('id', task.id);
    assert.equal(status.error?.code, '42501');
    assert.equal(handover.error?.code, '42501');
    assert.equal(removal.error?.code, '42501');
  }

  const { data } = await owner.from('tasks').select('status, owner_id').eq('id', task.id).single();
  assert.deepEqual(data, { status: 'open', owner_id: await userId(owner) });
});

test('a Task that is Done or Cancelled can no longer be changed', async () => {
  const owner = await staffMember();
  const taskMaster = await signInAs(uniqueEmail('tm'), { staff: { taskMaster: true } });

  for (const status of ['done', 'cancelled']) {
    const task = await open(owner);
    await admin.from('tasks').update({ status }).eq('id', task.id);
    for (const client of [owner, taskMaster]) {
      const { data } = await client.from('tasks').update({ title: 'Rewritten' }).eq('id', task.id).select();
      assert.deepEqual(data, []);
    }
  }
});

test('Tasks are listed by status, and a Staff member lists the ones they own', async () => {
  const me = await staffMember();
  const mine = await open(me);
  const started = await open(me);
  const theirs = await open(await staffMember());
  await comment(me, started);
  const ids = [mine.id, started.id, theirs.id];

  const open_ = await me.from('tasks').select('id').eq('status', 'open').in('id', ids).order('id');
  const owned = await me.from('tasks').select('id').eq('owner_id', await userId(me)).order('id');

  assert.deepEqual(open_.data, [{ id: mine.id }, { id: theirs.id }]);
  assert.deepEqual(owned.data, [{ id: mine.id }, { id: started.id }]);
});

test('a user who is not Staff cannot read or open any Task', async () => {
  await open(await staffMember());
  const stranger = await signInAs(uniqueEmail('stranger'));

  const read = await stranger.from('tasks').select('*');
  const opened = await stranger.from('tasks').insert({ title: 'Let me in', description: 'Please.' });
  const changed = await stranger.from('tasks').update({ title: 'Mine now' }).gt('id', 0).select();

  assert.equal(read.error, null);
  assert.deepEqual(read.data, []);
  assert.equal(opened.error?.code, '42501');
  assert.deepEqual(changed.data, []);
});

test('a removed Staff member reads no Task and cannot change the one they own', async () => {
  const email = uniqueEmail('leaver');
  const leaver = await signInAs(email, { staff: {} });
  const task = await open(leaver);
  await admin.from('staff').update({ removed_at: new Date().toISOString() }).eq('email', email);

  const read = await leaver.from('tasks').select('id');
  const change = await leaver.from('tasks').update({ title: 'Still here' }).eq('id', task.id).select();

  assert.deepEqual(read.data, []);
  assert.deepEqual(change.data, []);
});

test('a visitor who is not signed in can read no Task', async () => {
  const { data, error } = await anonymous().from('tasks').select('*');

  assert.equal(error?.code, '42501');
  assert.equal(data, null);
});

test('a Staff member sets their own name, and nobody else’s', async () => {
  const email = uniqueEmail('staff');
  const otherEmail = uniqueEmail('other');
  const me = await signInAs(email, { staff: {} });
  await signInAs(otherEmail, { staff: {} });

  const mine = await me.from('staff').update({ name: 'Nicha W.' }).eq('email', email).select('name');
  const theirs = await me.from('staff').update({ name: 'Not you' }).eq('email', otherEmail).select();

  const blank = await me.from('staff').update({ name: '   ' }).eq('email', email);

  assert.deepEqual(mine.data, [{ name: 'Nicha W.' }]);
  assert.deepEqual(theirs.data, []);
  assert.equal(blank.error?.code, '23514');
});
