import assert from 'node:assert/strict';
import { test } from 'node:test';
import { anonymous, signInAs, uniqueEmail } from './helpers.mjs';

test('a Staff member reads the other Staff members', async () => {
  const email = uniqueEmail('staff');
  const otherEmail = uniqueEmail('other');
  const me = await signInAs(email, { staff: {} });
  await signInAs(otherEmail, { staff: { taskMaster: true } });

  const { data, error } = await me
    .from('staff')
    .select('email, is_task_master')
    .in('email', [email, otherEmail])
    .order('is_task_master');

  assert.equal(error, null);
  assert.deepEqual(data, [
    { email, is_task_master: false },
    { email: otherEmail, is_task_master: true },
  ]);
});

test('a signed-in email that is not registered can read nothing', async () => {
  await signInAs(uniqueEmail('seeded'), { staff: {} });
  const stranger = await signInAs(uniqueEmail('stranger'));

  const { data, error } = await stranger.from('staff').select('*');

  assert.equal(error, null);
  assert.deepEqual(data, []);
});

test('a visitor who is not signed in can read nothing', async () => {
  const { data, error } = await anonymous().from('staff').select('*');

  assert.equal(error?.code, '42501'); // refused outright, not merely filtered to nothing
  assert.equal(data, null);
});

test('a Staff member can change their own language but not their role', async () => {
  const email = uniqueEmail('staff');
  const me = await signInAs(email, { staff: {} });

  const language = await me.from('staff').update({ language: 'th' }).eq('email', email).select('language');
  assert.equal(language.error, null);
  assert.deepEqual(language.data, [{ language: 'th' }]);

  const promote = await me.from('staff').update({ is_task_master: true }).eq('email', email);
  assert.notEqual(promote.error, null);

  const { data } = await me.from('staff').select('language, is_task_master').eq('email', email);
  assert.deepEqual(data, [{ language: 'th', is_task_master: false }]);
});

test('a Staff member cannot change another Staff member’s language', async () => {
  const otherEmail = uniqueEmail('other');
  await signInAs(otherEmail, { staff: {} });
  const me = await signInAs(uniqueEmail('staff'), { staff: {} });

  const { data } = await me.from('staff').update({ language: 'ja' }).eq('email', otherEmail).select();

  assert.deepEqual(data, []);
});
