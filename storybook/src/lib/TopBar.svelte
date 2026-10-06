<script>
  import Avatar from './Avatar.svelte';
  import Icon from './Icon.svelte';

  const locales = ['th', 'en', 'ja'];

  let {
    nav = [
      { id: 'overview', label: 'Overview' },
      { id: 'tasks', label: 'Tasks' },
      { id: 'organizations', label: 'Organizations' },
      { id: 'staff', label: 'Staff' },
    ],
    active = 'overview',
    user = 'Somchai Prasert',
    locale = $bindable('en'),
    // minimal: no navigation, used for Customers and the sign-in page.
    minimal = false,
  } = $props();
</script>

<header class="topbar">
  <a class="brand" href="#top">
    <span class="mark">タ</span>
    <span class="name">Tasuku</span>
  </a>

  {#if !minimal}
    <nav>
      {#each nav as item (item.id)}
        <a href="#{item.id}" class:active={item.id === active}>{item.label}</a>
      {/each}
    </nav>
  {/if}

  <div class="right">
    <div class="locale" role="group" aria-label="Language">
      {#each locales as code}
        <button class:active={code === locale} onclick={() => (locale = code)}
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
  .mark {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 10px;
    background: linear-gradient(140deg, #7a74ff, var(--c-primary));
    color: #fff;
    font-weight: 700;
    font-size: 16px;
  }
  .name {
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
    color: var(--c-primary-hover);
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
    color: var(--c-primary-hover);
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
