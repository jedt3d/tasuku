<script>
  // PROTOTYPE: what a Customer sees for their one Task, phone first. Mock data only.
  import Avatar from '../lib/Avatar.svelte';
  import Badge from '../lib/Badge.svelte';
  import Button from '../lib/Button.svelte';
  import Composer from '../lib/Composer.svelte';
  import Icon from '../lib/Icon.svelte';
  import Timeline from '../lib/Timeline.svelte';
  import TopBar from '../lib/TopBar.svelte';
  import { customer, resolvedEvent, staff, task } from '../lib/mock.js';

  // framed: draw a phone-sized frame around the screen, for viewing on a desktop canvas.
  let { status = 'in_progress', framed = true } = $props();

  const entries = $derived(status === 'resolved' ? [...task.timeline, resolvedEvent] : task.timeline);
</script>

<div class="stage" class:framed>
  <div class="screen">
    <TopBar minimal user={customer.name} />

    <header class="summary">
      <a class="back" href="#tasks"><Icon name="chevronLeft" size={16} /> My Tasks</a>
      <h1>{task.title}</h1>
      <div class="meta">
        <Badge {status} />
        <span>Task {task.id}</span>
        <span class="owner"><Avatar name={staff.owner} size={22} />{staff.owner}</span>
      </div>
    </header>

    {#if status === 'resolved'}
      <section class="confirm">
        <strong>PSP considers this finished. Is it done for you?</strong>
        <p>If we don't hear from you, it closes automatically in 31 hours.</p>
        <div class="choices">
          <Button variant="primary" icon="checkCircle" label="Yes, mark Done" block />
          <Button icon="reopen" label="Reopen" block />
        </div>
      </section>
    {/if}

    <main>
      <Timeline {entries} viewer="customer" />
    </main>

    <footer>
      <Composer placeholder="Reply to PSP…" />
      {#if status !== 'resolved'}
        <div class="closing">
          <button class="text">Mark as Done</button>
          <button class="text danger">Cancel this Task</button>
        </div>
      {/if}
    </footer>
  </div>
</div>

<style>
  .stage.framed {
    display: grid;
    place-items: start center;
    min-height: 100vh;
    padding: var(--s-6) var(--s-3);
    background: var(--c-bg);
  }
  .screen {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: var(--c-surface);
  }
  .framed .screen {
    width: min(390px, 100%);
    min-height: 780px;
    border: 1px solid var(--c-border);
    border-radius: 28px;
    box-shadow: var(--shadow-lg);
    overflow: hidden;
  }
  .summary {
    display: grid;
    gap: 8px;
    padding: var(--s-4);
    border-bottom: 1px solid var(--c-border);
  }
  .back {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    color: var(--c-primary-hover);
    font-size: var(--fs-sm);
    font-weight: 500;
    text-decoration: none;
  }
  h1 {
    margin: 0;
    font-size: var(--fs-xl);
    font-weight: 700;
    line-height: 1.3;
    letter-spacing: -0.01em;
  }
  .meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 12px;
    color: var(--c-text-3);
    font-size: var(--fs-sm);
  }
  .owner {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .confirm {
    display: grid;
    gap: 4px;
    padding: var(--s-4);
    background: var(--c-amber-bg);
    color: var(--c-amber-fg);
  }
  .confirm p {
    margin: 0;
    font-size: var(--fs-sm);
  }
  .choices {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: var(--s-2);
    margin-top: var(--s-3);
  }
  main {
    flex: 1;
    padding: var(--s-5) var(--s-4) 0;
  }
  footer {
    position: sticky;
    bottom: 0;
    padding: var(--s-3) var(--s-4) var(--s-4);
    border-top: 1px solid var(--c-border);
    background: var(--c-surface);
  }
  .closing {
    display: flex;
    justify-content: space-between;
    margin-top: var(--s-3);
  }
  .text {
    padding: 0;
    border: 0;
    background: none;
    color: var(--c-primary-hover);
    font-size: var(--fs-sm);
    font-weight: 500;
    cursor: pointer;
  }
  .text.danger {
    color: var(--c-red-fg);
  }
</style>
