<script>
  // Pass `status` for a Task status, or `tone` + `label` for anything else.
  const statuses = {
    open: ['slate', 'Open'],
    in_progress: ['blue', 'In progress'],
    resolved: ['amber', 'Resolved'],
    done: ['green', 'Done'],
    cancelled: ['red', 'Cancelled'],
    settled: ['green', 'Settled'],
  };

  let { status, tone = 'slate', label = '', dot = true, caps = false } = $props();

  const resolved = $derived(status ? statuses[status] : [tone, label]);
</script>

<span class="badge {resolved[0]}" class:caps>
  {#if dot}<span class="dot"></span>{/if}{resolved[1]}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 10px;
    border-radius: var(--r-pill);
    font-size: var(--fs-xs);
    font-weight: 600;
    line-height: 1.6;
    white-space: nowrap;
  }
  .caps {
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 11px;
  }
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }
  .slate {
    background: var(--c-slate-bg);
    color: var(--c-slate-fg);
  }
  .blue {
    background: var(--c-blue-bg);
    color: var(--c-blue-fg);
  }
  .amber {
    background: var(--c-amber-bg);
    color: var(--c-amber-fg);
  }
  .green {
    background: var(--c-green-bg);
    color: var(--c-green-fg);
  }
  .red {
    background: var(--c-red-bg);
    color: var(--c-red-fg);
  }
  .violet {
    background: var(--c-violet-bg);
    color: var(--c-violet-fg);
  }
</style>
