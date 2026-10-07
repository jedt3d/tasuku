// The invite function (ADR 0003): the only place an account is created. A Task Master registers an
// email as Staff. It checks the caller, creates the account, and does nothing else; every other rule
// is Row Level Security.
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

  const url = Deno.env.get('SUPABASE_URL')!;
  const authorization = request.headers.get('Authorization') ?? '';

  // Read the caller's own Staff record with the caller's own rights: Row Level Security shows it
  // only to Staff who have not been removed.
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    ...options,
    global: { headers: { Authorization: authorization } },
  });
  const { data: who } = await caller.auth.getUser(authorization.replace(/^Bearer /i, ''));
  if (!who?.user) return reply(401, 'not_signed_in');
  const { data: me, error: denied } = await caller
    .from('staff')
    .select('is_task_master')
    .eq('user_id', who.user.id)
    .maybeSingle();
  if (denied) return reply(500, 'failed');
  if (!me?.is_task_master) return reply(403, 'not_task_master');

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(400, 'invalid_email');

  // From here on, the secret key. An account that exists already (a removed Staff member, or
  // later a Customer) is kept as it is and only registered as Staff.
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, options);
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (created.error && created.error.code !== 'email_exists') {
    console.error('createUser:', created.error.message);
    return reply(created.error.status === 422 ? 400 : 500, created.error.status === 422 ? 'invalid_email' : 'failed');
  }
  const registered = await admin.rpc('register_staff', { staff_email: email });
  if (registered.error || !registered.data) {
    console.error('register_staff:', registered.error?.message ?? 'no account found');
    return reply(500, 'failed');
  }
  return reply(200);
});
