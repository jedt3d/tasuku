<script>
  import Avatar from './Avatar.svelte';
  import Badge from './Badge.svelte';
  import Button from './Button.svelte';

  // Activity over time: one dot per day with activity, placed by date (x) and time of day (y).
  // points: { day, hour, weight, tone, title, when, summary, people, status }
  let {
    title = 'Activity',
    legend = [],
    points = [],
    days = 90,
    months = [],
    ranges = ['All time', '90 days', '30 days'],
    range = $bindable('90 days'),
    selected = $bindable(null),
    onopen,
  } = $props();

  const hourMarks = [6, 14, 22];
  const left = (p) => (p.day / days) * 100;
  const top = (hour) => ((hour - 3) / 22) * 100;
  const hourLabel = (h) => `${((h + 11) % 12) + 1} ${h < 12 ? 'AM' : 'PM'}`;

  const current = $derived(selected == null ? null : points[selected]);
  // Open the card away from the nearest edge so it never leaves the plot.
  const below = $derived(current ? top(current.hour) < 55 : false);
</script>

<section class="scatter">
  <header>
    <h3>{title}</h3>
    <div class="legend">
      {#each legend as item (item.label)}<span><i class={item.tone}></i>{item.label}</span>{/each}
    </div>
    <div class="ranges" role="group" aria-label="Range">
      {#each ranges as r (r)}
        <button class:active={r === range} onclick={() => (range = r)}>{r}</button>
      {/each}
    </div>
  </header>

  <div class="plot">
    {#each hourMarks as h (h)}
      <div class="hline" style="top:{top(h)}%"><span>{hourLabel(h)}</span></div>
    {/each}
    <div class="area">
      {#each points as p, i (i)}
        <button
          class="pt {p.tone}"
          class:on={i === selected}
          style="left:{left(p)}%;top:{top(p.hour)}%;--d:{10 + p.weight * 5}px"
          aria-label="{p.title}, {p.when}"
          aria-pressed={i === selected}
          onclick={() => (selected = selected === i ? null : i)}
        ></button>
      {/each}

      {#if current}
        <div
          class="pop"
          class:below
          style="left:clamp(160px, {left(current)}%, calc(100% - 160px));{below
            ? `top:calc(${top(current.hour)}% + 18px)`
            : `bottom:calc(${100 - top(current.hour)}% + 18px)`}"
        >
          <div class="phead"><strong>{current.title}</strong><time>{current.when}</time></div>
          <p>{current.summary}</p>
          <div class="pmeta">
            <span class="people">
              {#each current.people as person (person)}<Avatar name={person} size={26} />{/each}
            </span>
            <Badge status={current.status} />
          </div>
          <div class="pactions">
            <Button size="sm" label="Peek" block />
            <Button size="sm" variant="soft" label="Open Task" block onclick={() => onopen?.(current)} />
          </div>
        </div>
      {/if}
    </div>
  </div>

  <div class="scrub">
    <div class="track"><span class="window">{range}</span></div>
    <div class="months">{#each months as month (month)}<span>{month}</span>{/each}</div>
  </div>
</section>

<style>
  .scatter {
    border: 1px solid var(--c-border);
    border-radius: var(--r-lg);
    background: var(--c-surface);
  }
  header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--s-3) var(--s-5);
    padding: var(--s-4) var(--s-5);
    border-bottom: 1px solid var(--c-border);
  }
  h3 {
    margin: 0;
    font-size: var(--fs-lg);
    font-weight: 600;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    color: var(--c-text-3);
    font-size: var(--fs-sm);
  }
  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .legend i,
  .pt {
    border-radius: 50%;
    background: #c9cdd8;
  }
  .legend i {
    width: 9px;
    height: 9px;
  }
  .primary {
    background: var(--c-primary) !important;
  }
  .green {
    background: #2e9e6b !important;
  }
  .amber {
    background: #e2a23a !important;
  }
  .ranges {
    display: flex;
    margin-left: auto;
    padding: 3px;
    border-radius: var(--r-md);
    background: var(--c-surface-2);
  }
  .ranges button {
    height: 28px;
    padding: 0 10px;
    border: 0;
    border-radius: 7px;
    background: none;
    color: var(--c-text-3);
    font-size: var(--fs-sm);
    font-weight: 500;
    cursor: pointer;
  }
  .ranges button.active {
    background: var(--c-surface);
    color: var(--c-text);
    box-shadow: var(--shadow-sm);
  }

  .plot {
    position: relative;
    height: 250px;
    margin: var(--s-5) var(--s-5) var(--s-3) 64px;
    background: repeating-linear-gradient(
      to right,
      transparent 0 calc(100% / 3 - 1px),
      var(--c-border) calc(100% / 3 - 1px) calc(100% / 3)
    );
  }
  .hline {
    position: absolute;
    left: 0;
    right: 0;
    border-top: 1px dashed var(--c-border);
  }
  .hline span {
    position: absolute;
    right: 100%;
    top: -9px;
    margin-right: 12px;
    color: var(--c-text-3);
    font-size: var(--fs-xs);
    white-space: nowrap;
  }
  .area {
    position: absolute;
    inset: 0;
  }
  .pt {
    position: absolute;
    width: var(--d);
    height: var(--d);
    padding: 0;
    border: 0;
    transform: translate(-50%, -50%);
    cursor: pointer;
    transition: box-shadow 0.12s;
  }
  .pt:hover,
  .pt.on {
    box-shadow:
      0 0 0 4px var(--c-surface),
      0 0 0 6px var(--c-primary-border);
  }

  .pop {
    position: absolute;
    z-index: 2;
    width: 300px;
    padding: 14px;
    border: 1px solid var(--c-border);
    border-radius: var(--r-lg);
    background: var(--c-surface);
    box-shadow: var(--shadow-lg);
    transform: translateX(-50%);
  }
  .phead {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
  }
  .phead time {
    color: var(--c-text-3);
    font-size: var(--fs-sm);
    white-space: nowrap;
  }
  .pop p {
    margin: 4px 0 10px;
    color: var(--c-text-3);
  }
  .pmeta {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .people {
    display: flex;
  }
  .people :global(.avatar + .avatar) {
    margin-left: -6px;
    box-shadow: 0 0 0 2px var(--c-surface);
  }
  .pactions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--c-border);
  }

  .scrub {
    padding: 0 var(--s-5) var(--s-4) 64px;
  }
  .track {
    display: grid;
    place-items: center;
    height: 36px;
    border-radius: var(--r-md);
    background: repeating-linear-gradient(
      to right,
      var(--c-border-strong) 0 2px,
      transparent 2px 12px
    );
    background-size: auto 14px;
    background-repeat: repeat-x;
    background-position: center;
  }
  .window {
    padding: 6px 56px;
    border: 1px solid var(--c-border-strong);
    border-radius: var(--r-md);
    background: var(--c-surface);
    font-weight: 600;
    box-shadow: var(--shadow-sm);
  }
  .months {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    margin-top: 6px;
    color: var(--c-text-3);
    font-size: var(--fs-sm);
    text-align: center;
  }
</style>
