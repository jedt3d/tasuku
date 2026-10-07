<script>
  import '@ui/tokens.css';
  import TopBar from '@ui/lib/TopBar.svelte';
  import logo from '@ui/assets/logo.svg';
  import { i18n } from '@ui/i18n/index.svelte.js';
  import { auth, rememberLocale, start } from '#lib/session.svelte.js';

  let { children } = $props();

  start();
  $effect(() => rememberLocale(i18n.locale));
</script>

<svelte:head><link rel="icon" href={logo} /></svelte:head>

<div class="app">
  <TopBar minimal user={auth.email ?? ''} />
  {#if auth.ready}{@render children()}{/if}
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
</style>
