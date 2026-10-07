import assert from 'node:assert/strict';
import { test } from 'node:test';
import { anonymous, signIn, signInAs, uniqueEmail } from './helpers.mjs';

const invite = (client, email) => client.functions.invoke('invite-staff', { body: { email } });
const status = (result) => result.error?.context?.status ?? 200;

test('a Task Master adds a Staff member by email, who can then sign in as Staff', async () => {
  const taskMaster = await signInAs(uniqueEmail('tm'), { staff: { taskMaster: true } });
  const email = uniqueEmail('newcomer');

  const added = await invite(taskMaster, ` ${email.toUpperCase()} `); // typed carelessly
  assert.equal(added.error, null);

  // The sign-in page can now send them a link, and once in they are Staff, not a Task Master.
  const sent = await anonymous().auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  assert.equal(sent.error, null);
  const newcomer = await signIn(email);
  const { data } = await newcomer.from('staff').select('email, is_task_master').eq('email', email);
  assert.deepEqual(data, [{ email, is_task_master: false }]);
});

test('a Task Master adds a removed Staff member again, who gets access back', async () => {
  const taskMaster = await signInAs(uniqueEmail('tm'), { staff: { taskMaster: true } });
  const email = uniqueEmail('returning');
  const returning = await signInAs(email, { staff: {} });
  const mine = () => returning.from('staff').select('user_id').eq('email', email);
  await taskMaster.rpc('remove_staff', { staff_id: (await mine()).data[0].user_id });
  assert.deepEqual((await mine()).data, []);

  assert.equal((await invite(taskMaster, email)).error, null);

  assert.equal((await mine()).data.length, 1);
});

test('a Task Master is told when the email is not an email address', async () => {
  const taskMaster = await signInAs(uniqueEmail('tm'), { staff: { taskMaster: true } });

  assert.equal(status(await invite(taskMaster, 'not an email')), 400);
});

test('nobody but a Task Master can add a Staff member', async () => {
  const staff = await signInAs(uniqueEmail('staff'), { staff: {} });
  const stranger = await signInAs(uniqueEmail('stranger'));
  const email = uniqueEmail('wanted');

  assert.equal(status(await invite(staff, email)), 403);
  assert.equal(status(await invite(stranger, email)), 403);
  assert.equal(status(await invite(anonymous(), email)), 401);

  // No account came to exist: the sign-in page still sends this email nothing.
  const sent = await anonymous().auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  assert.equal(sent.error?.code, 'otp_disabled');
});
