import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  admin,
  anonymous,
  close,
  comment,
  move,
  openTask,
  signInAs,
  staffMember,
  taskMaster,
  uniqueEmail,
  userId,
} from './helpers.mjs';

// The Timeline of `task` as `client` reads it, oldest first.
async function timeline(client, task, columns = 'kind, body, status, author_id') {
  const { data, error } = await client
    .from('timeline_entries')
    .select(columns)
    .eq('task_id', task.id)
    .order('created_at')
    .order('id');
  if (error) throw error;
  return data;
}

const edit = (client, entry, body) =>
  client.from('timeline_entries').update({ body }).eq('id', entry.id).select('body, edited_at');

const statusOf = async (client, task) =>
  (await client.from('tasks').select('status').eq('id', task.id).single()).data.status;

test('the Timeline of a new Task says who opened it', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);

  assert.deepEqual(await timeline(owner, task), [
    { kind: 'opened', body: null, status: null, author_id: await userId(owner) },
  ]);
});

test('the Owner posts a comment and reads it on the Timeline, with their name', async () => {
  const email = uniqueEmail('owner');
  const owner = await signInAs(email, { staff: {} });
  await owner.from('staff').update({ name: 'Somchai P.' }).eq('email', email);
  const task = await openTask(owner);

  const posted = await comment(owner, task, 'Battery ordered.');

  assert.equal(posted.error, null);
  const entries = await timeline(owner, task, 'kind, body, edited_at, author:staff!author_id(name, email)');
  assert.deepEqual(entries[1], {
    kind: 'comment',
    body: 'Battery ordered.',
    edited_at: null,
    author: { name: 'Somchai P.', email },
  });
});

test('a comment is kept exactly as written', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);
  const body = '  <b>ไม่ใช่ HTML</b> & **not** markdown\n\n\tindented   line 日本語 \n';

  await comment(owner, task, body);

  assert.equal((await timeline(owner, task))[1].body, body);
});

test('a comment cannot be blank', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);

  assert.equal((await comment(owner, task, ' \n ')).error?.code, '23514');
  assert.equal((await comment(owner, task, null)).error?.code, '23514');
});

test('the first Staff comment on an Open Task moves it to In progress, once', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);
  const me = await userId(owner);

  await comment(owner, task, 'First.');
  await comment(owner, task, 'Second.');

  assert.equal(await statusOf(owner, task), 'in_progress');
  assert.deepEqual(await timeline(owner, task), [
    { kind: 'opened', body: null, status: null, author_id: me },
    { kind: 'comment', body: 'First.', status: null, author_id: me },
    { kind: 'moved', body: null, status: 'in_progress', author_id: null },
    { kind: 'comment', body: 'Second.', status: null, author_id: me },
  ]);
});

test('two first comments at the same moment record one move to In progress', async () => {
  const owner = await staffMember();
  const master = await taskMaster();
  const task = await openTask(owner);

  await Promise.all([comment(owner, task, 'Mine.'), comment(master, task, 'And mine.')]);

  const kinds = (await timeline(owner, task)).map((entry) => entry.kind);
  assert.deepEqual(kinds.toSorted(), ['comment', 'comment', 'moved', 'opened']);
});

test('a comment on a Resolved Task leaves it Resolved', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);
  await comment(owner, task);
  await move(owner, task, 'resolve');

  const posted = await comment(owner, task, 'One more detail.');

  assert.equal(posted.error, null);
  assert.equal(await statusOf(owner, task), 'resolved');
  assert.deepEqual(
    (await timeline(owner, task)).map((entry) => entry.kind),
    ['opened', 'comment', 'moved', 'moved', 'comment'],
  );
});

test('a Task Master comments on any Task', async () => {
  const task = await openTask(await staffMember());
  const master = await taskMaster();

  const posted = await comment(master, task);

  assert.equal(posted.error, null);
  assert.equal(await statusOf(master, task), 'in_progress');
});

test('Staff who are not on the Task read its Timeline but cannot comment', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);
  await comment(owner, task, 'Visible to all Staff.');
  const reader = await staffMember();

  const entries = await timeline(reader, task);
  const posted = await comment(reader, task, 'Me too.');

  assert.deepEqual(entries.map((entry) => entry.kind), ['opened', 'comment', 'moved']);
  assert.equal(entries[1].body, 'Visible to all Staff.');
  assert.equal(posted.error?.code, '42501');
});

test('an author edits their comment within 15 minutes, and not afterwards', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);
  const { data: entry } = await comment(owner, task, 'Battery orderd.');

  const inTime = await edit(owner, entry, 'Battery ordered.');
  const blank = await edit(owner, entry, ' \n ');
  const old = new Date(Date.now() - 16 * 60 * 1000).toISOString();
  await admin.from('timeline_entries').update({ created_at: old }).eq('id', entry.id);
  const tooLate = await edit(owner, entry, 'Rewritten later.');

  assert.equal(inTime.data[0].body, 'Battery ordered.');
  assert.equal(blank.error?.code, '23514');
  assert.notEqual(inTime.data[0].edited_at, null);
  assert.deepEqual(tooLate.data, []);
  const kept = (await timeline(owner, task)).find((entry) => entry.kind === 'comment');
  assert.equal(kept.body, 'Battery ordered.');
});

test('nobody edits a comment they did not write, a Task Master included', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);
  const { data: entry } = await comment(owner, task);

  for (const client of [await staffMember(), await taskMaster()]) {
    assert.deepEqual((await edit(client, entry, 'Hijacked')).data, []);
  }
});

test('an author cannot delete their comment, nor change anything but its text', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);
  const { data: entry } = await comment(owner, task);
  const mine = () => owner.from('timeline_entries');

  const removal = await mine().delete().eq('id', entry.id);
  const backdated = await mine().update({ created_at: new Date().toISOString() }).eq('id', entry.id);
  const disowned = await mine().update({ author_id: await userId(await staffMember()) }).eq('id', entry.id);
  const viaFunction = await owner.rpc('delete_comment', { entry_id: entry.id });

  for (const refused of [removal, backdated, disowned, viaFunction]) {
    assert.equal(refused.error?.code, '42501');
  }
  assert.equal((await timeline(owner, task))[1].body, 'On it.');
});

test('nobody writes an event or a comment in another name through the API', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);
  const entries = () => owner.from('timeline_entries');

  const event = await entries().insert({ task_id: task.id, kind: 'moved', status: 'done' });
  const forged = await entries().insert({ task_id: task.id, body: 'Hi', author_id: await userId(await staffMember()) });
  const rewritten = await entries().update({ body: 'I did not open it' }).eq('task_id', task.id).select();

  assert.equal(event.error?.code, '42501');
  assert.equal(forged.error?.code, '42501');
  assert.deepEqual(rewritten.data, []);
});

test('a Task Master deletes a comment: the Timeline keeps a marker and loses the text', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);
  const { data: entry } = await comment(owner, task, 'Patient name: do not keep this.');
  const master = await taskMaster();

  const deleted = await master.rpc('delete_comment', { entry_id: entry.id });
  const again = await master.rpc('delete_comment', { entry_id: entry.id });

  assert.equal(deleted.error, null);
  assert.equal(again.error?.code, 'P0002');
  const [, marker] = await timeline(owner, task, 'kind, body, deleted_at, deleted_by, author_id');
  assert.equal(marker.kind, 'comment');
  assert.equal(marker.body, null);
  assert.notEqual(marker.deleted_at, null);
  assert.equal(marker.deleted_by, await userId(master));
  assert.equal(marker.author_id, await userId(owner));
  assert.deepEqual((await edit(owner, entry, 'Back again')).data, []);
});

test('a Task that is Done or Cancelled takes no comment and no edit', async () => {
  const owner = await staffMember();
  const master = await taskMaster();

  for (const status of ['done', 'cancelled']) {
    const task = await openTask(owner);
    const { data: entry } = await comment(owner, task);
    await close(owner, task, status);

    for (const client of [owner, master]) {
      assert.equal((await comment(client, task, 'One more thing')).error?.code, '42501');
    }
    assert.deepEqual((await edit(owner, entry, 'Rewritten')).data, []);
  }
});

test('a user who is not Staff reads no Timeline and cannot comment', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);
  await comment(owner, task);
  const stranger = await signInAs(uniqueEmail('stranger'));

  assert.deepEqual(await timeline(stranger, task), []);
  assert.equal((await comment(stranger, task)).error?.code, '42501');
  assert.equal((await anonymous().from('timeline_entries').select('*')).error?.code, '42501');
});

test('a removed Staff member reads no Timeline, and cannot comment on or edit in the Task they own', async () => {
  const email = uniqueEmail('leaver');
  const leaver = await signInAs(email, { staff: {} });
  const task = await openTask(leaver);
  const { data: entry } = await comment(leaver, task);
  await admin.from('staff').update({ removed_at: new Date().toISOString() }).eq('email', email);

  assert.deepEqual(await timeline(leaver, task), []);
  assert.equal((await comment(leaver, task)).error?.code, '42501');
  assert.deepEqual((await edit(leaver, entry, 'Still here')).data, []);
});
