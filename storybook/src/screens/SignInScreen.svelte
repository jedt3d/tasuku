<script>
  // PROTOTYPE: passwordless sign-in, shared by Staff and Customers. Mock only.
  import Button from '../lib/Button.svelte';
  import Field from '../lib/Field.svelte';
  import Icon from '../lib/Icon.svelte';
  import TopBar from '../lib/TopBar.svelte';
  import { t } from '../i18n/index.svelte.js';

  let { sent = false } = $props();
  let done = $state(sent);
</script>

<div class="app">
  <TopBar minimal user="" />
  <main>
    <section class="card">
      {#if done}
        <span class="icon"><Icon name="mail" size={24} /></span>
        <h1>{t('signin.sentTitle')}</h1>
        <p>{t('signin.sentBody', { email: 'ploy.s@lanna-medical.example' })}</p>
        <Button label={t('signin.other')} block onclick={() => (done = false)} />
      {:else}
        <h1>{t('signin.title')}</h1>
        <p>{t('signin.body')}</p>
        <Field label={t('signin.email')} type="email" icon="mail" placeholder="name@example.com" />
        <Button variant="primary" label={t('signin.send')} block onclick={() => (done = true)} />
      {/if}
    </section>
  </main>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: var(--c-bg);
  }
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
</style>
