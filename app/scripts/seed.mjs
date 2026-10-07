// Installation step: registers the first Task Master (ADR 0003: accounts are not created through the app).
// Local:  npm run stack:up   (uses TASK_MASTER_EMAIL, default task.master@example.test)
// Cloud:  SUPABASE_URL=... SUPABASE_SECRET_KEY=... TASK_MASTER_EMAIL=... node scripts/seed.mjs
// The secret key stays in your shell; it must never reach the browser or the repository.
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { localSupabase } from './local-supabase.mjs';

export async function seedTaskMaster(admin, address) {
  const email = address.trim().toLowerCase(); // Auth stores emails in lower case
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  let user = created.data.user;
  if (created.error?.code === 'email_exists') {
    // The account exists already (the seed was run before): find it. Auth has no lookup by email.
    for (let page = 1; !user; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      user = data.users.find((u) => u.email === email);
      if (data.users.length < 1000) break;
    }
    if (!user) throw new Error(`Auth says ${email} exists but did not list it.`);
  } else if (created.error) throw created.error;

  const { error } = await admin
    .from('staff')
    .upsert({ user_id: user.id, email, is_task_master: true, removed_at: null }, { onConflict: 'user_id' });
  if (error) throw error;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (Boolean(SUPABASE_URL) !== Boolean(SUPABASE_SECRET_KEY))
    throw new Error('Set both SUPABASE_URL and SUPABASE_SECRET_KEY, or neither to use the local stack.');
  const { url, secretKey } = SUPABASE_URL ? { url: SUPABASE_URL, secretKey: SUPABASE_SECRET_KEY } : localSupabase();
  const email = process.env.TASK_MASTER_EMAIL ?? 'task.master@example.test';
  await seedTaskMaster(createClient(url, secretKey, { auth: { persistSession: false } }), email);
  console.log(`Task Master registered: ${email}`);
}
