<script>
  // PROTOTYPE: passwordless sign-in, shared by Staff and Customers. Mock only.
  import Button from '../lib/Button.svelte';
  import Field from '../lib/Field.svelte';
  import Icon from '../lib/Icon.svelte';
  import TopBar from '../lib/TopBar.svelte';

  let { sent = false } = $props();
  let done = $state(sent);
</script>

<div class="app">
  <TopBar minimal user="" />
  <main>
    <section class="card">
      {#if done}
        <span class="icon"><Icon name="mail" size={24} /></span>
        <h1>Check your email</h1>
        <p>We sent a sign-in link to <strong>ploy.s@lanna-medical.example</strong>. Open it to continue.</p>
        <Button label="Use a different email" block onclick={() => (done = false)} />
      {:else}
        <h1>Sign in to Tasuku</h1>
        <p>Enter your email and we'll send you a link. No password needed.</p>
        <Field label="Email" type="email" icon="mail" placeholder="name@example.com" />
        <Button variant="primary" label="Send magic link" block onclick={() => (done = true)} />
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
