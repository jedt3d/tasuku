<script>
  // What a Customer lands on: the Tasks they are on, and nothing else. Row Level Security returns
  // only those, so the list asks for every Task it may read (ADR 0002).
  import Badge from '@ui/lib/Badge.svelte';
  import { t } from '@ui/i18n/index.svelte.js';
  import { supabase } from '#lib/supabase.js';

  let tasks = $state([]);
  let problem = $state(''); // a message key, or '' when there is nothing to report

  supabase
    .from('tasks')
    .select('id, title, status')
    .order('id', { ascending: false })
    .then(({ data, error }) => {
      problem = error ? 'common.error' : '';
      tasks = data ?? [];
    });
</script>

<main>
  <section class="panel">
    <header><h1>{t('customer.myTasks')}</h1></header>
    {#if problem}
      <p class="error" role="alert">{t(problem)}</p>
    {:else if tasks.length}
      <ul>
        {#each tasks as task (task.id)}
          <li>
            <a href="/tasks/{task.id}">
              <span class="number">#{task.id}</span>
              <span class="title">{task.title}</span>
              <Badge status={task.status} />
            </a>
          </li>
        {/each}
      </ul>
    {:else}
      <p>{t('home.empty')}</p>
    {/if}
  </section>
</main>

<style>
  main {
    flex: 1;
    display: grid;
    justify-items: center;
    align-content: start;
    padding: var(--s-5) var(--s-4) var(--s-8);
  }
  .panel {
    width: min(720px, 100%);
    border: 1px solid var(--c-border);
    border-radius: var(--r-lg);
    background: var(--c-surface);
  }
  .panel header {
    padding: var(--s-4) var(--s-5);
    border-bottom: 1px solid var(--c-border);
  }
  h1 {
    margin: 0;
    font-size: var(--fs-lg);
    font-weight: 600;
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li + li {
    border-top: 1px solid var(--c-border);
  }
  li a {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-2) var(--s-4);
    padding: var(--s-3) var(--s-5);
    color: var(--c-text);
    text-decoration: none;
  }
  li a:hover {
    background: var(--c-surface-2);
  }
  .number {
    color: var(--c-text-3);
    font-size: var(--fs-sm);
  }
  .title {
    flex: 1;
    min-width: 12ch;
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  p {
    margin: 0;
    padding: var(--s-5);
    color: var(--c-text-3);
  }
  .error {
    color: var(--c-red-fg);
  }
</style>
