<script>
  import Avatar from './Avatar.svelte';
  import Icon from './Icon.svelte';
  import defaultLogo from '../assets/logo.svg';
  import { i18n, locales, setLocale, t } from '../i18n/index.svelte.js';

  let {
    nav = ['overview', 'tasks', 'organizations', 'staff'],
    active = 'overview',
    user = 'Somchai Prasert',
    // logo: URL of an SVG. Set wordmark to false when the SVG already contains the name.
    logo = defaultLogo,
    wordmark = true,
    // minimal: no navigation, used for Customers and the sign-in page.
    minimal = false,
    // links: where each nav id (and `home`, the brand) leads. Without one, a prototype anchor.
    links = {},
  } = $props();
</script>

<header class="topbar">
  <a class="brand" href={links.home ?? '#top'}>
    <img class="logo" src={logo} alt={wordmark ? '' : 'Tasuku'} />
    {#if wordmark}<span class="name">Tasuku</span>{/if}
  </a>

  {#if !minimal}
    <nav>
      {#each nav as id (id)}
        <a href={links[id] ?? `#${id}`} class:active={id === active}>{t(`nav.${id}`)}</a>
      {/each}
    </nav>
  {/if}

  <div class="right">
    <div class="locale" role="group" aria-label={t('nav.language')}>
      {#each locales as code (code)}
        <button class:active={code === i18n.locale} onclick={() => setLocale(code)}
          >{code.toUpperCase()}</button
        >
      {/each}
    </div>
    {#if user}
      <span class="user">
        <Avatar name={user} size={34} />
        <span class="uname">{user}</span>
        <Icon name="chevronDown" size={15} />
      </span>
    {/if}
  </div>
</header>

<style>
  .topbar {
    container-type: inline-size;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0 var(--s-6);
    min-height: 64px;
    padding: 0 var(--s-6);
    background: var(--c-surface);
    border-bottom: 1px solid var(--c-border);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--c-text);
    text-decoration: none;
  }
  .logo {
    display: block;
    height: 30px;
    width: auto;
  }
  .name {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: var(--fs-lg);
    letter-spacing: -0.01em;
  }
  nav {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  nav a {
    font-family: var(--font-display);
    padding: 7px 12px;
    border-radius: 8px;
    color: var(--c-text-3);
    font-weight: 500;
    text-decoration: none;
    white-space: nowrap;
  }
  nav a:hover {
    color: var(--c-text);
  }
  nav a.active {
    background: var(--c-primary-soft);
    color: var(--c-primary-text);
  }
  .right {
    display: flex;
    align-items: center;
    gap: var(--s-4);
    margin-left: auto;
  }
  .locale {
    display: flex;
    padding: 3px;
    border: 1px solid var(--c-border);
    border-radius: var(--r-md);
  }
  .locale button {
    height: 26px;
    padding: 0 8px;
    border: 0;
    border-radius: 7px;
    background: none;
    color: var(--c-text-3);
    font-size: var(--fs-xs);
    font-weight: 600;
    cursor: pointer;
  }
  .locale button.active {
    background: var(--c-primary-soft);
    color: var(--c-primary-text);
  }
  .user {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--c-text-3);
  }
  .uname {
    color: var(--c-text);
    font-weight: 500;
    white-space: nowrap;
  }

  /* Sized by its own width, not the viewport, so it also adapts inside a narrow frame. */
  @container (max-width: 560px) {
    .uname {
      display: none;
    }
    /* No room beside the brand: the navigation takes its own row. */
    nav {
      order: 3;
      flex-basis: 100%;
      padding-bottom: 10px;
    }
  }
</style>
