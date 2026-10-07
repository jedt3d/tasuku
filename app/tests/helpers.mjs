// Test seam: the Supabase API of the local stack, called as a given user.
// Run `npm run stack:up` first.
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { localSupabase } from '../scripts/local-supabase.mjs';

export const env = localSupabase();
const options = { auth: { persistSession: false, autoRefreshToken: false } };

// The secret key bypasses Row Level Security: tests use it only to arrange, never to assert. It
// arranges users, the age of a comment, and a Task's closing status until a function sets one (#8).
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
