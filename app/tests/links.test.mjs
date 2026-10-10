import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addCollaborator, anonymous, close, comment, customerOf, link, move, openTask, related, signInAs, staffMember,
  taskMaster, transfer, uniqueEmail, unlink, userId,
} from './helpers.mjs';

test('a Staff member who is on neither Task links them, and the link shows on both', async () => {
  const owner = await staffMember();
  const other = await staffMember();
  const [first, second, third] = [await openTask(owner), await openTask(owner), await openTask(owner)];

  // Whatever their numbers: the higher one can be named first.
  const { data, error } = await link(other, third, first);
  assert.equal((await link(other, first, second)).error, null);

  assert.equal(error, null);
  assert.equal(data[0].added_by, await userId(other));
  assert.ok(data[0].added_at);
  assert.deepEqual(await related(owner, first), [second.id, third.id]);
  assert.deepEqual(await related(owner, second), [first.id]);
  assert.deepEqual(await related(owner, third), [first.id]);
  // A link is not an event of the Timeline.
  const { data: entries } = await owner.from('timeline_entries').select('kind').in('task_id', [first.id, third.id]);
  assert.deepEqual(entries.map((entry) => entry.kind), ['opened', 'opened']);
});

test('the same pair is not linked twice, a Task is not linked to itself, nor to a number that is no Task', async () => {
  const staff = await staffMember();
  const [first, second] = [await openTask(staff), await openTask(staff)];
  assert.equal((await link(staff, first, second)).error, null);

  assert.equal((await link(staff, first, second)).error?.code, '23505');
  assert.equal((await link(staff, second, first)).error?.code, '23505');
  assert.equal((await link(staff, first, first)).error?.code, '23514');
  assert.equal((await link(staff, first, { id: 2 ** 40 })).error?.code, '23503');

  assert.deepEqual(await related(staff, first), [second.id]);
});

test('nobody writes another name on a link, or changes one', async () => {
  const staff = await staffMember();
  const someone = await userId(await staffMember());
  const [first, second] = [await openTask(staff), await openTask(staff)];

  const signed = await staff
    .from('task_links')
    .insert({ task_id: first.id, related_task_id: second.id, added_by: someone });
  assert.equal(signed.error?.code, '42501');
  assert.equal((await link(staff, first, second)).error, null);
  const changed = await staff.from('task_links').update({ related_task_id: first.id + 1 }).eq('task_id', first.id);
  assert.equal(changed.error?.code, '42501');
});

test('the page reads the Tasks related to one in one query, each with its title and status', async () => {
  const staff = await staffMember();
  // `middle` is the higher number of one pair and the lower of the other.
  const low = await openTask(staff, { title: 'Before' });
  const middle = await openTask(staff, { title: 'Middle' });
  const after = await openTask(staff, { title: 'After' });
  await close(staff, after, 'cancelled');
  assert.equal((await link(staff, middle, low)).error, null);
  assert.equal((await link(staff, middle, after)).error, null);
  // A pair `middle` is not part of.
  assert.equal((await link(staff, low, after)).error, null);

  const { data, error } = await staff
    .from('task_links')
    .select('a:tasks!task_id(id, title, status), b:tasks!related_task_id(id, title, status)')
    .or(`task_id.eq.${middle.id},related_task_id.eq.${middle.id}`);

  assert.equal(error, null);
  const others = data.map(({ a, b }) => (a.id === middle.id ? b : a)).sort((x, y) => x.id - y.id);
  assert.deepEqual(others, [
    { id: low.id, title: 'Before', status: 'open' },
    { id: after.id, title: 'After', status: 'cancelled' },
  ]);
});

test('every Staff member links and unlinks a Task in any status', async () => {
  const owner = await staffMember();
  const other = await staffMember();
  const master = await taskMaster();
  const collaborator = await staffMember();
  const open = await openTask(owner);
  await addCollaborator(owner, open, collaborator);
  const done = await openTask(owner);
  await close(owner, done, 'done');
  const cancelled = await openTask(owner);
  await close(owner, cancelled, 'cancelled');
  const old = await openTask(owner);
  assert.equal((await transfer(owner, old)).error, null);
  const resolved = await openTask(owner);
  await comment(owner, resolved); // In progress
  assert.equal((await move(owner, resolved, 'resolve')).error, null);

  for (const task of [resolved, done, cancelled, old]) {
    for (const client of [owner, collaborator, master, other]) {
      assert.equal((await link(client, open, task)).error, null);
      // Whoever it is takes away a link, their own or not.
      const removed = await unlink(client === other ? owner : other, task, open);
      assert.equal(removed.error, null);
      assert.equal(removed.data.length, 1);
    }
    assert.deepEqual(await related(owner, task), []);
  }
});

test('a Customer, a removed Staff member, a stranger and someone not signed in neither read nor write a link', async () => {
  const owner = await staffMember();
  const master = await taskMaster();
  const leaver = await staffMember();
  const [first, second, third] = [await openTask(owner), await openTask(owner), await openTask(owner)];
  // The Customer of both Tasks, and a Collaborator on both until removed from Staff.
  const email = uniqueEmail('customer');
  const customer = await customerOf(owner, first, email);
  await customerOf(owner, second, email);
  await addCollaborator(owner, first, leaver);
  assert.equal((await link(leaver, first, second)).error, null);
  assert.equal((await master.rpc('remove_staff', { staff_id: await userId(leaver) })).error, null);
  const stranger = await signInAs(uniqueEmail('stranger'));

  for (const client of [customer, leaver, stranger]) {
    assert.deepEqual(await related(client, first), []);
    assert.equal((await link(client, first, third)).error?.code, '42501');
    assert.deepEqual((await unlink(client, first, second)).data, []);
  }
  assert.equal((await anonymous().from('task_links').select('*')).error?.code, '42501');
  assert.equal((await link(anonymous(), first, third)).error?.code, '42501');
  assert.equal((await unlink(anonymous(), first, second)).error?.code, '42501');

  // The link of a Staff member since removed stays, under their name.
  assert.deepEqual(await related(owner, first), [second.id]);
});

test('a Task shows the Tasks that carry it on: every Task whose earlier Task it is', async () => {
  const owner = await staffMember();
  const other = await staffMember();
  const task = await openTask(owner);
  const [second, third] = [
    await openTask(other, { earlier_task_id: task.id, title: 'Second' }),
    await openTask(owner, { earlier_task_id: task.id, title: 'Third' }),
  ];
  await comment(other, second);

  // As the Task page asks: both directions with the Task itself.
  const columns = 'id, earlier:earlier_task_id(id, title, status), carriedOn:tasks!earlier_task_id(id, title, status)';
  const read = (id) => other.from('tasks').select(columns).eq('id', id).order('id', { referencedTable: 'carriedOn' }).single();
  const { data, error } = await read(task.id);

  assert.equal(error, null);
  assert.deepEqual(data, {
    id: task.id,
    earlier: null,
    carriedOn: [
      { id: second.id, title: 'Second', status: 'in_progress' },
      { id: third.id, title: 'Third', status: 'open' },
    ],
  });
  assert.deepEqual((await read(third.id)).data, {
    id: third.id,
    earlier: { id: task.id, title: task.title, status: 'open' },
    carriedOn: [],
  });
});

test('the links of a transferred Task follow to the new Task, under the name of whoever transfers; the old Task keeps its own', async () => {
  const owner = await staffMember();
  const other = await staffMember();
  const master = await taskMaster();
  const [lower, task, higher] = [await openTask(owner), await openTask(owner), await openTask(owner)];
  assert.equal((await link(other, task, lower)).error, null);
  assert.equal((await link(other, higher, task)).error, null);

  const { data: next, error } = await transfer(master, task);

  assert.equal(error, null);
  assert.deepEqual(await related(owner, { id: next }), [lower.id, higher.id]);
  // The old and the new Task are not Related Tasks: the new one carries the old one on.
  assert.deepEqual(await related(owner, task), [lower.id, higher.id]);
  const signed = async (id) =>
    (await owner.from('task_links').select('added_by, added_at').or(`task_id.eq.${id},related_task_id.eq.${id}`)).data;
  const [copied, original] = [await signed(next), await signed(task.id)];
  assert.deepEqual(copied.map((row) => row.added_by), [await userId(master), await userId(master)]);
  assert.deepEqual(original.map((row) => row.added_by), [await userId(other), await userId(other)]);
  assert.ok(copied.every((row) => original.every((before) => Date.parse(row.added_at) > Date.parse(before.added_at))));
});

test('the earlier Task of a Task opened by a transfer is not changed or cleared; one set by hand is', async () => {
  const owner = await staffMember();
  const master = await taskMaster();
  const collaborator = await staffMember();
  const [first, task] = [await openTask(owner), await openTask(owner)];
  await addCollaborator(owner, task, collaborator);
  const { data: next } = await transfer(owner, task);
  const byHand = await openTask(owner, { earlier_task_id: first.id });

  // Everyone who changes the details of the new Task.
  for (const client of [owner, collaborator, master]) {
    for (const earlier_task_id of [null, first.id]) {
      const { error } = await client.from('tasks').update({ earlier_task_id }).eq('id', next);
      assert.equal(error?.code, '42501');
    }
  }
  // Its other details are still changed, also when the number is sent along unchanged.
  const kept = await owner.from('tasks').update({ title: 'Renamed', earlier_task_id: task.id }).eq('id', next).select();
  assert.equal(kept.error, null);
  assert.equal(kept.data[0].title, 'Renamed');
  assert.equal(kept.data[0].earlier_task_id, task.id);

  const cleared = await owner.from('tasks').update({ earlier_task_id: null }).eq('id', byHand.id).select();
  assert.equal(cleared.data[0].earlier_task_id, null);
});
