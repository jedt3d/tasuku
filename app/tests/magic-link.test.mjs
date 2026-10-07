import assert from 'node:assert/strict';
import { test } from 'node:test';
import { seedTaskMaster } from '../scripts/seed.mjs';
import { admin, anonymous, env, uniqueEmail } from './helpers.mjs';

const mailSentTo = async (email, attempts = 20) => {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const search = await fetch(`${env.mailpitUrl}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    const { messages } = await search.json();
    if (messages.length) {
      const mail = await fetch(`${env.mailpitUrl}/api/v1/message/${messages[0].ID}`);
      return mail.json();
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return null;
};

test('the seeded Task Master signs in with the magic link from Mailpit', async () => {
  const email = uniqueEmail('taskmaster');
  await seedTaskMaster(admin, email);
  const client = anonymous();

  const sent = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  assert.equal(sent.error, null);

  const mail = await mailSentTo(email);
  const link = mail.HTML.match(/href="([^"]*\/auth\/v1\/verify[^"]*)"/)[1].replaceAll('&amp;', '&');
  const opened = await fetch(link, { redirect: 'manual' });
  const session = new URLSearchParams(new URL(opened.headers.get('location')).hash.slice(1));
  await client.auth.setSession({
    access_token: session.get('access_token'),
    refresh_token: session.get('refresh_token'),
  });

  const { data } = await client.from('staff').select('email, is_task_master').eq('email', email);
  assert.deepEqual(data, [{ email, is_task_master: true }]);
});

test('an email with no account is sent no magic link, even when the caller asks for an account', async () => {
  const email = uniqueEmail('nobody');

  // No `shouldCreateUser: false` here: sign-up must be closed by the server, not by the app's good manners.
  const sent = await anonymous().auth.signInWithOtp({ email });

  assert.equal(sent.error?.code, 'signup_disabled');
  assert.equal(await mailSentTo(email, 4), null);
});
