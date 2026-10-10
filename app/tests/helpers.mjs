// Test seam: the Supabase API of the local stack, called as a given user.
// Run `npm run stack:up` first.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { write } from '../../supabase/functions/send-emails/emails/index.js';
import { localSupabase } from '../scripts/local-supabase.mjs';

export const env = localSupabase();
const options = { auth: { persistSession: false, autoRefreshToken: false } };

// The secret key bypasses Row Level Security: tests use it only to arrange, never to assert. It
// arranges users and the age of a comment, and runs the scheduled job as pg_cron does.
export const admin = createClient(env.url, env.secretKey, options);
export const anonymous = () => createClient(env.url, env.publishableKey, options);

export const uniqueEmail = (name) => `${name}-${randomUUID().slice(0, 8)}@example.test`;

// Signs in as an account that already exists, without sending mail.
export async function signIn(email) {
  const link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (link.error) throw link.error;
  const client = anonymous();
  const verified = await client.auth.verifyOtp({
    token_hash: link.data.properties.hashed_token,
    type: 'magiclink',
  });
  if (verified.error) throw verified.error;
  return client;
}

// Creates the account for a new `email` and signs in as it. `staff` registers the email as Staff,
// as the seed does.
export async function signInAs(email, { staff } = {}) {
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (created.error) throw created.error;
  if (staff) {
    const { error } = await admin
      .from('staff')
      .insert({ user_id: created.data.user.id, email, is_task_master: staff.taskMaster ?? false });
    if (error) throw error;
  }
  return signIn(email);
}

export const staffMember = () => signInAs(uniqueEmail('staff'), { staff: {} });
export const taskMaster = () => signInAs(uniqueEmail('tm'), { staff: { taskMaster: true } });
export const userId = async (client) => (await client.auth.getUser()).data.user.id;
export const emailOf = async (client) => (await client.auth.getUser()).data.user.email;

// Opens a Task as `client` and returns it as that person reads it back.
export async function openTask(client, fields = {}) {
  const { data, error } = await client
    .from('tasks')
    .insert({ title: 'Replace the UPS battery', description: 'Rack 2, server room.', ...fields })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Posts a comment on the Timeline of `task` as `client`. Resolves to the API's answer, error included.
export const comment = (client, task, body = 'On it.') =>
  client.from('timeline_entries').insert({ task_id: task.id, body }).select().single();

// Adds the Staff member signed in as `staff` to `task` as a Collaborator, acting as `client`.
// Resolves to the API's answer, error included.
export const addCollaborator = async (client, task, staff) =>
  client.from('task_collaborators').insert({ task_id: task.id, staff_id: await userId(staff) }).select();

// Who collaborates on `task`, as `client` reads it.
export async function collaborators(client, task) {
  const { data, error } = await client.from('task_collaborators').select('staff_id').eq('task_id', task.id);
  if (error) throw error;
  return data.map((row) => row.staff_id);
}

export const uniqueName = (name) => `${name} ${randomUUID().slice(0, 8)}`;

// Creates an Organization as `client`. Resolves to the API's answer, error included.
export const createOrganization = (client, name = uniqueName('Hospital')) =>
  client.from('organizations').insert({ name }).select('id, name').single();

// Adds `email` to `task` as its Customer, acting as `client`, through the invite function.
// Resolves to the function's answer, error included.
export const addCustomer = (client, task, email) =>
  client.functions.invoke('invite-customer', { body: { task_id: task.id, email } });

// Adds a new Customer to `task`, acting as `client`, and signs in as that Customer.
export async function customerOf(client, task, email = uniqueEmail('customer')) {
  const { error } = await addCustomer(client, task, email);
  if (error) throw error;
  return signIn(email);
}

// Moves `task` as `client`: `action` is resolve, complete (Done), reopen or cancel.
// Resolves to the API's answer, error included.
export const move = (client, task, action) => client.rpc(`${action}_task`, { task: task.id });

// Gives `task` to the Staff member signed in as `staff`, acting as `client`.
// Resolves to the API's answer, error included.
export const reassign = async (client, task, staff) =>
  client.rpc('reassign_task', { task: task.id, new_owner: await userId(staff) });

// Transfers `task` as `client`: resolves to the API's answer, whose data is the number of the Task
// that carries it on.
export const transfer = (client, task) => client.rpc('transfer_task', { task: task.id });

// Runs automatic closure as if it were `hours` from now: the job is not open to anyone signed in,
// and the status is still changed by the function under test. Every Resolved Task of the local
// stack that is due by then is closed with it.
export async function runClosure(hours = 0) {
  const { error } = await admin.rpc('close_due_tasks', { as_of: new Date(Date.now() + hours * 3600e3).toISOString() });
  if (error) throw error;
}

// Arranges a Task that is Done or Cancelled, acting as someone who may close it.
export async function close(client, task, status) {
  const { error } = await move(client, task, status === 'done' ? 'complete' : 'cancel');
  if (error) throw error;
}

export const pdf = Buffer.from('%PDF-1.4\n%%EOF\n');

// Uploads a file into the folder of `task` as `client`, straight through the Storage API.
// Resolves to Storage's answer, error included, with the `path` it tried.
export async function upload(client, task, body = pdf, contentType = 'application/pdf') {
  const path = `${task.id}/${randomUUID()}`;
  const { error } = await client.storage.from('attachments').upload(path, body, { contentType });
  return { path, error };
}

// Writes a comment on `task` as `client` with one uploaded file per name in `names`.
// Resolves to the API's answer, error included.
export async function attach(client, task, { body = '', names = ['report.pdf'] } = {}) {
  const files = [];
  for (const name of names) {
    const { path, error } = await upload(client, task);
    if (error) throw error;
    files.push({ path, name });
  }
  return client.rpc('comment_with_files', { task: task.id, body, files });
}

// The emails Mailpit holds for `email`, read once at least `count` have arrived. With no
// `count` it reads what is there now: use it for "no email" after another one of the same event
// has arrived and `settle()` has passed.
export async function emailsTo(email, count = 0) {
  const search = `${env.mailpitUrl}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`;
  for (let attempt = 0; ; attempt++) {
    const { messages } = await (await fetch(search)).json();
    if (messages.length >= count || attempt === 40) {
      return Promise.all(
        messages.map(async ({ ID }) => (await fetch(`${env.mailpitUrl}/api/v1/message/${ID}`)).json()),
      );
    }
    await settle(250);
  }
}

// Where an email sends its reader: the Task, in the app.
export const taskLink = (task) => `http://localhost:5173/tasks/${task.id}`;

// The one email of `kind` about `task` among `mails`, checked for its recipient, its language
// (the subject is the catalogue's) and its link. `values` is what the text names besides the Task:
// `actor` (whoever did it), `hours` (left before the Task closes by itself), `owner` (the new Owner).
export function emailAbout(mails, kind, task, { to, language = 'en', ...values }) {
  const link = taskLink(task);
  const expected = write(language, kind, { id: task.id, title: task.title, link, ...values });
  const found = mails.filter((mail) => mail.Subject === expected.subject && mail.Text.trim() === expected.text);
  assert.equal(found.length, 1, `one "${kind}" email in ${language}`);
  assert.deepEqual(found[0].To.map((recipient) => recipient.Address), [to]);
  assert.ok(found[0].Text.includes(link));
  return found[0];
}

export const settle = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));
