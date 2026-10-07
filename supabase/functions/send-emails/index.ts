// Sends the emails waiting in the outbox (#10). The database calls this after every event that
// queued one, and every minute while something is still waiting. It takes no input: who is told
// what is decided by the database (`claim_emails`), and an email that fails stays there.
import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { write } from './emails/index.js';

const env = (name: string) => Deno.env.get(name) ?? '';

// Plain text only: the title of a Task is written by a person and goes in as it is.
// Port 25 and 587 are closed to Edge Functions, so mail leaves over HTTP: Mailgun's API on the
// cloud project, Mailpit's on the local stack (MAILPIT_URL is set in supabase/config.toml).
function send(to: string, subject: string, text: string) {
  const from = env('MAIL_FROM');
  // A mail server that does not answer must not hold the rest of the outbox.
  const signal = AbortSignal.timeout(10_000);
  if (env('MAILGUN_URL')) {
    const form = new FormData();
    for (const [field, value] of Object.entries({ from, to, subject, text })) form.append(field, value);
    return fetch(env('MAILGUN_URL'), {
      method: 'POST',
      headers: { Authorization: `Basic ${btoa(`api:${env('MAILGUN_API_KEY')}`)}` },
      body: form,
      signal,
    });
  }
  const [, name, address] = from.match(/^(.*?)\s*<(.+)>$/) ?? ['', '', from];
  return fetch(`${env('MAILPIT_URL')}/api/v1/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ From: { Name: name, Email: address }, To: [{ Email: to }], Subject: subject, Text: text }),
    signal,
  });
}

Deno.serve(async (request) => {
  const secret = env('SEND_EMAILS_SECRET');
  if (!secret || request.headers.get('Authorization') !== `Bearer ${secret}`) {
    return new Response(null, { status: 401 });
  }

  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const claimed = await db.rpc('claim_emails');
  if (claimed.error) {
    console.error('claim_emails:', claimed.error.message);
    return new Response(null, { status: 500 });
  }

  let sent = 0;
  for (const mail of claimed.data) {
    const { subject, text } = write(mail.language, mail.kind, {
      id: mail.task_id,
      title: mail.title,
      actor: mail.actor,
      link: `${env('SITE_URL')}/tasks/${mail.task_id}`,
    });
    try {
      const answer = await send(mail.email, subject, text);
      if (!answer.ok) throw new Error(`${answer.status} ${await answer.text()}`);
      const marked = await db.rpc('email_sent', { email_id: mail.id });
      if (marked.error) throw new Error(marked.error.message);
      sent++;
    } catch (error) {
      // Left in the outbox: `claim_emails` offers it again.
      console.error(`email ${mail.id}:`, error instanceof Error ? error.message : error);
    }
  }
  return Response.json({ sent, failed: claimed.data.length - sent });
});
