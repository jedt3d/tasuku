<script>
  import { page } from '$app/state';
  import '@ui/tokens.css';
  import Button from '@ui/lib/Button.svelte';
  import TopBar from '@ui/lib/TopBar.svelte';
  import logo from '@ui/assets/logo.svg';
  import { i18n, t } from '@ui/i18n/index.svelte.js';
  import { auth, displayName, rememberLocale, signOut, start } from '#lib/session.svelte.js';

  let { children } = $props();

  // Only the pages that exist are in the navigation.
  const links = { home: '/', overview: '/', customers: '/customers', staff: '/staff' };
  const section = $derived(['customers', 'staff'].find((id) => page.url.pathname.startsWith(links[id])) ?? 'overview');

  start();
  $effect(() => rememberLocale(i18n.locale));
</script>

<svelte:head><link rel="icon" href={logo} /></svelte:head>

<div class="app">
  <TopBar
    minimal={!auth.staff}
    nav={['overview', 'customers', 'staff']}
    {links}
    active={section}
    user={auth.staff ? displayName({ ...auth.staff, email: auth.email }) : (auth.email ?? '')}
  />
  {#if auth.ready}{@render children()}{/if}
  {#if auth.email}
    <footer><Button variant="ghost" size="sm" label={t('signin.signOut')} onclick={signOut} /></footer>
  {/if}
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  footer {
    display: flex;
    justify-content: center;
    padding: var(--s-4);
  }
</style>
