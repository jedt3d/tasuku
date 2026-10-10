import assert from 'node:assert/strict';
import { test } from 'node:test';
import { write } from '../../supabase/functions/send-emails/emails/index.js';
import {
  addCollaborator, addCustomer, anonymous, attach, comment, customerOf, emailsTo, env, move, openTask, runClosure,
  settle,
  staffMember, taskMaster, uniqueEmail, userId,
} from './helpers.mjs';

const emailOf = async (client) => (await client.auth.getUser()).data.user.email;
const link = (task) => `http://localhost:5173/tasks/${task.id}`;

// The one email of `kind` about `task` among `mails`, checked for its recipient, its language
// (the subject is the catalogue's) and its link. `actor` is how whoever did it must be named;
// `hours` is how long the email says is left before the Task closes by itself.
function emailAbout(mails, kind, task, { to, language = 'en', actor, hours }) {
  const expected = write(language, kind, { id: task.id, title: task.title, actor, hours, link: link(task) });
  const found = mails.filter((mail) => mail.Subject === expected.subject && mail.Text.trim() === expected.text);
  assert.equal(found.length, 1, `one "${kind}" email in ${language}`);
  assert.deepEqual(found[0].To.map((recipient) => recipient.Address), [to]);
  assert.ok(found[0].Text.includes(link(task)));
  return found[0];
}

const setLanguage = async (client, table, language) => {
  const { error } = await client.from(table).update({ language }).eq('user_id', await userId(client));
  if (error) throw error;
};

test('a Staff member added to a Task gets an email in their language; whoever added them gets none', async () => {
  const owner = await staffMember();
  const helper = await staffMember();
  await setLanguage(helper, 'staff', 'th');
  const task = await openTask(owner);

  await addCollaborator(owner, task, helper);

  const to = await emailOf(helper);
  emailAbout(await emailsTo(to, 1), 'added', task, { to, language: 'th', actor: await emailOf(owner) });
  await settle();
  assert.deepEqual(await emailsTo(await emailOf(owner)), []);
});

test('a Customer added to a Task gets an email that names Staff without their email', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);
  const to = uniqueEmail('customer');

  await addCustomer(owner, task, to);

  const mail = emailAbout(await emailsTo(to, 1), 'added', task, { to, actor: 'PSP' });
  assert.ok(!mail.Text.includes(await emailOf(owner)));
});

test('the participants get an email for a comment by someone else, each in their language; the author gets none', async () => {
  const owner = await staffMember();
  const helper = await staffMember();
  const outsider = await taskMaster();
  const task = await openTask(owner);
  await addCollaborator(owner, task, helper);
  const customer = await customerOf(owner, task);
  await setLanguage(customer, 'customers', 'ja');
  await setLanguage(owner, 'staff', 'th');
  const { error: named } = await helper.from('staff').update({ name: 'Somchai' }).eq('user_id', await userId(helper));
  assert.equal(named, null);
  // A Task Master who only commented is not on the Task.
  assert.equal((await comment(outsider, task, 'Looking into it.')).error, null);

  assert.equal((await comment(helper, task, 'The battery is ordered.')).error, null);

  const [toOwner, toCustomer, toHelper] = await Promise.all([owner, customer, helper].map(emailOf));
  const ownerMails = await emailsTo(toOwner, 2);
  emailAbout(ownerMails, 'comment', task, { to: toOwner, language: 'th', actor: 'Somchai' });
  const customerMails = await emailsTo(toCustomer, 3);
  const mail = emailAbout(customerMails, 'comment', task, { to: toCustomer, language: 'ja', actor: 'Somchai' });
  assert.ok(!mail.Text.includes('The battery is ordered.'), 'the comment is not quoted');
  await settle();
  // The helper has the email for being added and nothing else; the Task Master has none.
  assert.equal((await emailsTo(toHelper)).filter((m) => !m.Subject.includes('added')).length, 1);
  assert.deepEqual(await emailsTo(await emailOf(outsider)), []);
});

test('a comment that is files without text sends the same email, with no file in it', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);
  const customer = await customerOf(owner, task);

  assert.equal((await attach(owner, task, { names: ['report.pdf'] })).error, null);

  const to = await emailOf(customer);
  const mail = emailAbout(await emailsTo(to, 2), 'comment', task, { to, actor: 'PSP' });
  assert.ok(!mail.Text.includes('report.pdf'));
  assert.equal(mail.Attachments.length, 0);
});

test('the Customer gets an email when their Task becomes Resolved, which says when it closes by itself; nobody else does', async () => {
  const owner = await staffMember();
  const helper = await staffMember();
  const task = await openTask(owner);
  await addCollaborator(owner, task, helper);
  const customer = await customerOf(owner, task);
  assert.equal((await comment(owner, task)).error, null);

  assert.equal((await move(owner, task, 'resolve')).error, null);

  const to = await emailOf(customer);
  const mail = emailAbout(await emailsTo(to, 3), 'resolved', task, { to, actor: 'PSP', hours: 48 });
  assert.ok(mail.Text.includes('48 hours'));
  await settle();
  // The helper: added, and the Owner's comment.
  assert.equal((await emailsTo(await emailOf(helper))).length, 2);
  assert.deepEqual(await emailsTo(await emailOf(owner)), []);
});

test('the Owner gets an email when the Customer cancels, and none when a Task Master does', async () => {
  const owner = await staffMember();
  const master = await taskMaster();
  const task = await openTask(owner);
  const customer = await customerOf(owner, task);
  const other = await openTask(owner);
  await customerOf(owner, other);

  assert.equal((await move(master, other, 'cancel')).error, null);
  assert.equal((await move(customer, task, 'cancel')).error, null);

  const to = await emailOf(owner);
  emailAbout(await emailsTo(to, 1), 'cancelled', task, { to, actor: await emailOf(customer) });
  await settle();
  assert.equal((await emailsTo(to)).length, 1);
});

test('a Staff member who is the Customer of a Task cancels as the Customer, and gets no email for it', async () => {
  const owner = await staffMember();
  const colleague = await staffMember();
  const task = await openTask(owner);
  const address = await emailOf(colleague);
  assert.equal((await addCustomer(owner, task, address)).error, null);

  assert.equal((await move(colleague, task, 'cancel')).error, null);

  const to = await emailOf(owner);
  emailAbout(await emailsTo(to, 1), 'cancelled', task, { to, actor: address });
  await settle();
  // Only the email for being added.
  assert.equal((await emailsTo(address)).length, 1);
});

test('a removed Staff member and a Customer who was replaced get nothing more', async () => {
  const owner = await staffMember();
  const master = await taskMaster();
  const helper = await staffMember();
  const task = await openTask(owner);
  await addCollaborator(owner, task, helper);
  const [toHelper, toFirst, toSecond] = [await emailOf(helper), uniqueEmail('first'), uniqueEmail('second')];
  // Each has the email for being added before anything changes: one that is still waiting when
  // its recipient leaves the Task is not sent either.
  await customerOf(owner, task, toFirst);
  assert.equal((await emailsTo(toFirst, 1)).length, 1);
  await customerOf(owner, task, toSecond);
  await Promise.all([toHelper, toSecond].map((to) => emailsTo(to, 1)));
  assert.equal((await master.rpc('remove_staff', { staff_id: await userId(helper) })).error, null);

  assert.equal((await comment(owner, task)).error, null);

  emailAbout(await emailsTo(toSecond, 2), 'comment', task, { to: toSecond, actor: 'PSP' });
  await settle();
  assert.equal((await emailsTo(toHelper)).length, 1);
  assert.equal((await emailsTo(toFirst)).length, 1);
});

// A Task of `owner` that is Resolved, with a Customer who has the three emails so far: added, the
// Owner's comment, Resolved.
async function resolvedTask(owner) {
  const task = await openTask(owner);
  const customer = await customerOf(owner, task);
  assert.equal((await comment(owner, task)).error, null);
  assert.equal((await move(owner, task, 'resolve')).error, null);
  const to = await emailOf(customer);
  await emailsTo(to, 3);
  return { task, customer, to };
}

test('the Customer gets one reminder before their Resolved Task closes by itself, and not before the lead time', async () => {
  const owner = await staffMember();
  const { task, to } = await resolvedTask(owner);

  await runClosure(23);
  await settle();
  assert.equal((await emailsTo(to)).length, 3);

  await runClosure(25);
  // The email says how long is left by the clock, which has not moved.
  emailAbout(await emailsTo(to, 4), 'reminder', task, { to, hours: 48 });
  await runClosure(26);
  await settle();
  assert.equal((await emailsTo(to)).length, 4);
  assert.deepEqual(await emailsTo(await emailOf(owner)), []);
});

test('a Task Reopened and Resolved again gets a reminder of its own', async () => {
  const owner = await staffMember();
  const { task, customer, to } = await resolvedTask(owner);
  await runClosure(25);
  await emailsTo(to, 4);

  assert.equal((await move(customer, task, 'reopen')).error, null);
  assert.equal((await move(owner, task, 'resolve')).error, null);
  await emailsTo(to, 5);
  await runClosure(25);

  const mails = await emailsTo(to, 6);
  const { subject } = write('en', 'reminder', { id: task.id, title: task.title });
  assert.equal(mails.filter((mail) => mail.Subject === subject).length, 2);
});

test('the Customer gets an email when their Task closed by itself, which names the Owner; the Owner gets none', async () => {
  const owner = await staffMember();
  const { task, to } = await resolvedTask(owner);

  await runClosure(49);

  // No reminder for a Task that is already past its time.
  emailAbout(await emailsTo(to, 4), 'closed', task, { to, actor: 'PSP' });
  await settle();
  assert.equal((await emailsTo(to)).length, 4);
  assert.deepEqual(await emailsTo(await emailOf(owner)), []);
});

test('a Customer who marks their Task Done themselves gets no email about it closing', async () => {
  const owner = await staffMember();
  const { task, customer, to } = await resolvedTask(owner);

  assert.equal((await move(customer, task, 'complete')).error, null);
  await runClosure(49);

  await settle();
  assert.equal((await emailsTo(to)).length, 3);
});

test('the link in an email works for a Customer who is not signed in: the magic link brings them back to the Task', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);
  const to = uniqueEmail('customer');
  await addCustomer(owner, task, to);
  const [added] = await emailsTo(to, 1);
  const [address] = added.Text.match(/http\S+/);
  assert.equal(address, link(task));

  // What the sign-in page does for someone who arrived at that address.
  const asked = await anonymous().auth.signInWithOtp({
    email: to,
    options: { shouldCreateUser: false, emailRedirectTo: address },
  });
  assert.equal(asked.error, null);

  const magic = (await emailsTo(to, 2)).find((mail) => mail.HTML.includes('/auth/v1/verify'));
  const verify = magic.HTML.match(/href="([^"]*\/auth\/v1\/verify[^"]*)"/)[1].replaceAll('&amp;', '&');
  const opened = await fetch(verify, { redirect: 'manual' });
  const landed = new URL(opened.headers.get('location'));
  assert.equal(landed.origin + landed.pathname, address);
  assert.ok(new URLSearchParams(landed.hash.slice(1)).get('access_token'));
});

test('the function that sends is not open to callers without the secret', async () => {
  const answer = await fetch(`${env.url}/functions/v1/send-emails`, { method: 'POST' });
  assert.equal(answer.status, 401);
});
