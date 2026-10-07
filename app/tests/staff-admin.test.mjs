import assert from 'node:assert/strict';
import { test } from 'node:test';
import { admin, signInAs, uniqueEmail } from './helpers.mjs';

const REFUSED = '42501';
const LAST_TASK_MASTER = 'TSK01';

// What `reader` is shown about `email`: the same list the Staff page reads.
const record = async (reader, email) => {
  const { data, error } = await reader
    .from('staff')
    .select('user_id, is_task_master, removed_at')
    .eq('email', email)
    .maybeSingle();
  assert.equal(error, null);
  return data;
};

const actors = async () => {
  const taskMaster = await signInAs(uniqueEmail('tm'), { staff: { taskMaster: true } });
  const staffEmail = uniqueEmail('staff');
  const staff = await signInAs(staffEmail, { staff: {} });
  const stranger = await signInAs(uniqueEmail('stranger'));
  return { taskMaster, staff, staffEmail, stranger, staffId: (await record(taskMaster, staffEmail)).user_id };
};

test('a Task Master promotes a Staff member to Task Master and demotes them again', async () => {
  const { taskMaster, staffEmail, staffId } = await actors();

  const promoted = await taskMaster.rpc('set_task_master', { staff_id: staffId, value: true });
  assert.equal(promoted.error, null);
  assert.equal((await record(taskMaster, staffEmail)).is_task_master, true);

  const demoted = await taskMaster.rpc('set_task_master', { staff_id: staffId, value: false });
  assert.equal(demoted.error, null);
  assert.equal((await record(taskMaster, staffEmail)).is_task_master, false);
});

test('a Task Master removes a Staff member, who loses access at once', async () => {
  const { taskMaster, staff, staffEmail, staffId } = await actors();

  const removed = await taskMaster.rpc('remove_staff', { staff_id: staffId });
  assert.equal(removed.error, null);

  // The removed person's session is still open; it is the database that stops showing them anything.
  const { data } = await staff.from('staff').select('email');
  assert.deepEqual(data, []);
  const language = await staff.from('staff').update({ language: 'th' }).eq('email', staffEmail).select();
  assert.deepEqual(language.data, []);
  // The record is kept, so that work they owned can still name them.
  assert.notEqual((await record(taskMaster, staffEmail)).removed_at, null);
});

test('a removed Task Master can no longer manage Staff', async () => {
  const { taskMaster, staffId } = await actors();
  const formerEmail = uniqueEmail('former');
  const former = await signInAs(formerEmail, { staff: { taskMaster: true } });

  await taskMaster.rpc('remove_staff', { staff_id: (await record(taskMaster, formerEmail)).user_id });

  const { error } = await former.rpc('set_task_master', { staff_id: staffId, value: true });
  assert.equal(error?.code, REFUSED);
});

test('a Staff member who is not a Task Master cannot promote, demote or remove anyone', async () => {
  const { taskMaster, staff, staffEmail, staffId } = await actors();

  assert.equal((await staff.rpc('set_task_master', { staff_id: staffId, value: true })).error?.code, REFUSED);
  assert.equal((await staff.rpc('remove_staff', { staff_id: staffId })).error?.code, REFUSED);
  const direct = await staff.from('staff').update({ is_task_master: true, removed_at: null }).eq('user_id', staffId);
  assert.notEqual(direct.error, null);

  assert.deepEqual(await record(taskMaster, staffEmail), { user_id: staffId, is_task_master: false, removed_at: null });
});

test('a signed-in email that is not registered cannot promote or remove anyone', async () => {
  const { taskMaster, stranger, staffEmail, staffId } = await actors();

  assert.equal((await stranger.rpc('set_task_master', { staff_id: staffId, value: true })).error?.code, REFUSED);
  assert.equal((await stranger.rpc('remove_staff', { staff_id: staffId })).error?.code, REFUSED);

  assert.deepEqual(await record(taskMaster, staffEmail), { user_id: staffId, is_task_master: false, removed_at: null });
});

test('the last remaining Task Master cannot be removed or demoted', async (t) => {
  const email = uniqueEmail('last');
  const last = await signInAs(email, { staff: { taskMaster: true } });
  // Arrange: stand every other Task Master down for the length of this test. Test files run one
  // at a time (see the `test` script), so no other test adds one meanwhile.
  const others = await admin.from('staff').update({ is_task_master: false }).eq('is_task_master', true).neq('email', email).select('user_id');
  assert.equal(others.error, null);
  const restore = () => admin.from('staff').update({ is_task_master: true }).in('user_id', others.data.map((s) => s.user_id));
  t.after(restore);
  const myId = (await record(last, email)).user_id;

  assert.equal((await last.rpc('set_task_master', { staff_id: myId, value: false })).error?.code, LAST_TASK_MASTER);
  assert.equal((await last.rpc('remove_staff', { staff_id: myId })).error?.code, LAST_TASK_MASTER);
  assert.deepEqual(await record(last, email), { user_id: myId, is_task_master: true, removed_at: null });

  // With a second Task Master in place, the first may step down.
  const secondEmail = uniqueEmail('second');
  await signInAs(secondEmail, { staff: {} });
  await last.rpc('set_task_master', { staff_id: (await record(last, secondEmail)).user_id, value: true });
  assert.equal((await last.rpc('set_task_master', { staff_id: myId, value: false })).error, null);
});
