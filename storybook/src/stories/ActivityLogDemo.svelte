<script>
  // The detailed form of the Timeline: composer on top, comments as cards, older entries collapsed.
  import Composer from '../lib/Composer.svelte';
  import Timeline from '../lib/Timeline.svelte';
  import { task } from '../lib/mock.js';

  let { viewer = 'staff' } = $props();

  const entries = $derived([
    ...task.timeline.slice(-5).reverse(),
    { kind: 'more', count: 6 },
    task.timeline[0],
  ]);
</script>

<div class="log">
  <Composer placeholder="Write a comment…" />
  <h2>Activity log</h2>
  <Timeline {entries} {viewer} cards />
</div>

<style>
  .log {
    display: grid;
    gap: var(--s-5);
    max-width: 760px;
  }
  h2 {
    margin: 0;
    font-size: var(--fs-xl);
  }
</style>
