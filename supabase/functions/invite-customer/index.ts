// The invite function for Customers (ADR 0003): a Staff member adds a Customer to a Task by email.
// The database decides who may (`set_customer`, as the caller); this creates the account when the
// email has none, and does nothing else.
import { createClient } from 'npm:@supabase/supabase-js@2.117.2';

// The app is served from another origin. No cookie is involved: the caller proves who they are
// with the Authorization header, so any origin may ask.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const reply = (status: number, error?: string) =>
  new Response(JSON.stringify(error ? { error } : {}), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
const options = { auth: { persistSession: false, autoRefreshToken: false } };

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(400, 'invalid_email');
  if (!Number.isSafeInteger(body.task_id)) return reply(400, 'invalid_task');

  const url = Deno.env.get('SUPABASE_URL')!;
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    ...options,
    global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } },
  });
  const add = () => caller.rpc('set_customer', { task: body.task_id, customer_email: email });

  let added = await add();
  if (added.error?.code === 'TSK02') {
    // The caller may choose this Task's Customer, and the email has no account: only now the
    // secret key. `email_exists` means someone else created it a moment ago, which is fine.
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, options);
    const created = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (created.error && created.error.code !== 'email_exists') {
      console.error('createUser:', created.error.message);
      return reply(500, 'failed');
    }
    added = await add();
  }
  if (!added.error) return reply(200);
  if (added.error.code === '42501') return reply(403, 'not_allowed');
  console.error('set_customer:', added.error.message);
  return reply(500, 'failed');
});
