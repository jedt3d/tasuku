// Test seam: the Supabase API of the local stack, called as a given user.
// Run `npm run stack:up` first.
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { localSupabase } from '../scripts/local-supabase.mjs';

export const env = localSupabase();
const options = { auth: { persistSession: false, autoRefreshToken: false } };

// The secret key bypasses Row Level Security: tests use it only to arrange, never to assert. It
// arranges users, and a Task's status for as long as no function sets one (#5, #8).
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
