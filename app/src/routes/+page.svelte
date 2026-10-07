<script>
  import Button from '@ui/lib/Button.svelte';
  import Field from '@ui/lib/Field.svelte';
  import Icon from '@ui/lib/Icon.svelte';
  import { t } from '@ui/i18n/index.svelte.js';
  import { auth, signOut } from '#lib/session.svelte.js';
  import { supabase } from '#lib/supabase.js';

  let email = $state('');
  let sentTo = $state('');
  let problem = $state(''); // a message key, or '' when there is nothing to report
  let sending = $state(false);

  async function sendLink(event) {
    event.preventDefault();
    const address = email.trim();
    if (!address) return;
    sending = true;
    problem = '';
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: { shouldCreateUser: false, emailRedirectTo: location.origin },
    });
    sending = false;
    // An email with no account is refused and sent nothing (ADR 0003). Say so: the API response
    // already tells them apart, and a mistyped address should not leave someone waiting for mail.
    if (error) problem = error.code === 'otp_disabled' ? 'signin.unknown' : 'signin.error';
    else sentTo = address;
  }
</script>

<main>
  {#if auth.email}
    <section class="card">
      <h1>{t('home.title')}</h1>
      {#if auth.failed}
        <p class="error" role="alert">{t('common.error')}</p>
      {:else}
        <p>{auth.staff ? t('home.empty') : t('home.noAccess')}</p>
        {#if auth.staff}<a href="/staff">{t('nav.staff')}</a>{/if}
      {/if}
      <Button label={t('signin.signOut')} block onclick={signOut} />
    </section>
  {:else if sentTo}
    <section class="card">
      <span class="icon"><Icon name="mail" size={24} /></span>
      <h1>{t('signin.sentTitle')}</h1>
      <p>{t('signin.sentBody', { email: sentTo })}</p>
      <Button label={t('signin.other')} block onclick={() => (sentTo = '')} />
    </section>
  {:else}
    <form class="card" onsubmit={sendLink}>
      <h1>{t('signin.title')}</h1>
      <p>{t('signin.body')}</p>
      <Field label={t('signin.email')} type="email" icon="mail" placeholder="name@example.com" bind:value={email} />
      {#if problem}<p class="error" role="alert">{t(problem)}</p>{/if}
      <Button type="submit" variant="primary" label={t('signin.send')} block disabled={sending} />
    </form>
  {/if}
</main>

<style>
  main {
    flex: 1;
    display: grid;
    place-items: center;
    padding: var(--s-6) var(--s-4);
  }
  .card {
    display: grid;
    gap: var(--s-4);
    width: min(400px, 100%);
    padding: var(--s-8);
    border: 1px solid var(--c-border);
    border-radius: var(--r-xl);
    background: var(--c-surface);
    box-shadow: var(--shadow-md);
  }
  .icon {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    border-radius: var(--r-md);
    background: var(--c-primary-soft);
    color: var(--c-primary);
  }
  h1 {
    margin: 0;
    font-size: var(--fs-2xl);
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  p {
    margin: 0;
    color: var(--c-text-3);
  }
  .error {
    color: var(--c-red-fg);
  }
</style>
