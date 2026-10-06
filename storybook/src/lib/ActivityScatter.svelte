<script>
  import Avatar from './Avatar.svelte';
  import Badge from './Badge.svelte';
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';

  // The Timeline in condensed form: only the events, as dots on a date axis.
  // groups: [{ name, rows: [{ name, points: [{ date, tone, weight, title, summary, status, people }] }] }]
  // A group is an Organization: its row gathers every dot beneath it and is not clickable.
  // Expanded, each row is one Customer, and a dot opens a card about that event.
  let {
    title = 'Activity',
    legend = [],
    groups = [],
    from,
    to,
    ranges = [
      { label: '30 days', days: 30 },
      { label: '90 days', days: 90 },
      { label: 'All time', days: null },
    ],
    range = $bindable('90 days'),
    expanded = $bindable([]),
    selected = $bindable(null),
    onpeek,
    onopen,
  } = $props();

  const DAY = 864e5;
  const t0 = $derived(Date.parse(from));
  const span = $derived(Math.round((Date.parse(to) - t0) / DAY));
  const windowDays = $derived(Math.min(ranges.find((r) => r.label === range)?.days ?? span, span));

  // The window is remembered by its right edge, so changing the range keeps the latest days in view.
  let end = $state(Infinity);
  const start = $derived(Math.max(0, Math.min(end, span) - windowDays));

  const fmt = (day, opts = { day: 'numeric', month: 'short' }) =>
    new Date(t0 + day * DAY).toLocaleDateString('en-GB', { timeZone: 'UTC', ...opts });
  const dayOf = (point) => (Date.parse(point.date) - t0) / DAY;

  const place = (points) =>
    points
      .map((point, index) => ({ ...point, index, x: ((dayOf(point) - start) / windowDays) * 100 }))
      .filter((point) => point.x >= 0 && point.x <= 100);

  const view = $derived(
    groups.map((group) => {
      const rows = group.rows.map((row) => ({ name: row.name, dots: place(row.points) }));
      return {
        name: group.name,
        open: expanded.includes(group.name),
        rows,
        dots: rows.flatMap((row) => row.dots),
      };
    }),
  );

  // Month starts always; Mondays too when the window is short enough to tell days apart.
  const ticks = $derived.by(() => {
    const out = [];
    for (let day = start; day <= start + windowDays; day++) {
      const date = new Date(t0 + day * DAY);
      const x = ((day - start) / windowDays) * 100;
      if (date.getUTCDate() === 1) out.push({ x, label: fmt(day, { month: 'short' }), major: true });
      else if (windowDays <= 45 && date.getUTCDay() === 1) out.push({ x, label: fmt(day, { day: 'numeric' }) });
    }
    return out;
  });

  const months = $derived.by(() => {
    const out = [];
    for (let day = 0; day < span; day++) {
      if (new Date(t0 + day * DAY).getUTCDate() === 1)
        out.push({ left: (day / span) * 100, label: fmt(day, { month: 'short' }) });
    }
    return out;
  });

  const toggle = (name) =>
    (expanded = expanded.includes(name) ? expanded.filter((n) => n !== name) : [...expanded, name]);

  // Scrubbing: the window slides along the same date axis as the ticks under it.
  let track = $state();
  let drag = $state(null);

  const moveTo = (day) =>
    (end = Math.round(Math.min(Math.max(day, 0), span - windowDays)) + windowDays);

  function down(event) {
    drag = { x: event.clientX, start };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event) {
    if (drag) moveTo(drag.start + ((event.clientX - drag.x) / track.clientWidth) * span);
  }
  function jump(event) {
    if (event.target !== track) return;
    const box = track.getBoundingClientRect();
    moveTo(((event.clientX - box.left) / box.width) * span - windowDays / 2);
  }
  function key(event) {
    const step = { ArrowLeft: -7, ArrowRight: 7, PageUp: -30, PageDown: 30, Home: -span, End: span }[
      event.key
    ];
    if (step) {
      event.preventDefault();
      moveTo(start + step);
    }
  }
</script>

<!-- Any click closes the card, including one on its own buttons; a click on a dot is handled by the dot. -->
<svelte:window
  onclick={(event) => {
    if (!event.target.closest?.('[data-dot]')) selected = null;
  }}
  onkeydown={(event) => {
    if (event.key === 'Escape') selected = null;
  }}
/>

<section class="scatter">
  <header>
    <div class="htitle">
      <h3>{title}</h3>
      <span class="period"
        >{fmt(start)} – {fmt(start + windowDays, { day: 'numeric', month: 'short', year: 'numeric' })}</span
      >
    </div>
    <div class="legend">
      {#each legend as item (item.label)}<span><i class="pt {item.tone}"></i>{item.label}</span>{/each}
    </div>
    <div class="ranges" role="group" aria-label="Range">
      {#each ranges as r (r.label)}
        <button class:active={r.label === range} onclick={() => (range = r.label)}>{r.label}</button>
      {/each}
    </div>
  </header>

  <div class="rows">
    <div class="grid" aria-hidden="true">
      {#each ticks as tick (tick.x)}
        <span class="tick" class:major={tick.major} style="left:{tick.x}%"><i>{tick.label}</i></span>
      {/each}
    </div>

    <div class="row axis"><span class="gutter"></span><div class="lane"></div></div>

    {#each view as group (group.name)}
      <div class="row group">
        <button class="gutter" aria-expanded={group.open} onclick={() => toggle(group.name)}>
          <span class="chev" class:open={group.open}><Icon name="chevronRight" size={15} /></span>
          <Avatar name={group.name} size={24} />
          <span class="gname">{group.name}</span>
          <span class="gcount">{group.dots.length}</span>
        </button>
        <div class="lane">
          {#each group.dots as dot, n (n)}
            <span class="pt {dot.tone}" style="left:{dot.x}%;--d:{8 + dot.weight * 4}px"></span>
          {/each}
        </div>
      </div>

      {#if group.open}
        {#each group.rows as row (row.name)}
          <div class="row">
            <span class="gutter sub"><Avatar name={row.name} size={22} /><span class="gname">{row.name}</span></span>
            <div class="lane" class:active={selected?.startsWith(`${group.name}/${row.name}/`)}>
              {#each row.dots as dot (dot.index)}
                {@const id = `${group.name}/${row.name}/${dot.index}`}
                <button
                  data-dot
                  class="pt {dot.tone}"
                  class:on={selected === id}
                  style="left:{dot.x}%;--d:{8 + dot.weight * 4}px"
                  aria-label="{dot.title}, {fmt(dayOf(dot))}"
                  aria-pressed={selected === id}
                  onclick={() => (selected = selected === id ? null : id)}
                ></button>
                {#if selected === id}
                  <div class="pop" style="left:clamp(160px, {dot.x}%, calc(100% - 160px))">
                    <div class="phead">
                      <strong>{dot.title}</strong>
                      <time>{fmt(dayOf(dot), { day: 'numeric', month: 'short', year: 'numeric' })}</time>
                    </div>
                    <p>{dot.summary}</p>
                    <div class="pmeta">
                      <span class="people">
                        {#each dot.people as person (person)}<Avatar name={person} size={26} />{/each}
                      </span>
                      <Badge status={dot.status} />
                    </div>
                    <div class="pactions">
                      <Button size="sm" label="Peek" block onclick={() => onpeek?.(dot)} />
                      <Button size="sm" variant="soft" label="Open Task" block onclick={() => onopen?.(dot)} />
                    </div>
                  </div>
                {/if}
              {/each}
            </div>
          </div>
        {/each}
      {/if}
    {/each}
  </div>

  <div class="row scrub">
    <span class="gutter"></span>
    <div>
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="track" bind:this={track} style="--weeks:{span / 7}" onpointerdown={jump}>
        <div
          class="window"
          class:dragging={drag}
          role="slider"
          tabindex="0"
          aria-label="Visible dates"
          aria-valuemin={0}
          aria-valuemax={span - windowDays}
          aria-valuenow={start}
          aria-valuetext="{fmt(start)} to {fmt(start + windowDays)}"
          style="left:{(start / span) * 100}%;width:{(windowDays / span) * 100}%"
          onpointerdown={down}
          onpointermove={move}
          onpointerup={() => (drag = null)}
          onpointercancel={() => (drag = null)}
          onkeydown={key}
        >
          <Icon name="chevronLeft" size={14} /><span>{range}</span><Icon name="chevronRight" size={14} />
        </div>
      </div>
      <div class="months">
        {#each months as month (month.left)}<span style="left:{month.left}%">{month.label}</span>{/each}
      </div>
    </div>
  </div>
</section>

<style>
  .scatter {
    --gutter: 248px;
    --pad: var(--s-5);
    border: 1px solid var(--c-border);
    border-radius: var(--r-lg);
    background: var(--c-surface);
  }
  header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--s-3) var(--s-5);
    padding: var(--s-4) var(--pad);
    border-bottom: 1px solid var(--c-border);
  }
  .htitle {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  h3 {
    margin: 0;
    font-size: var(--fs-lg);
    font-weight: 600;
  }
  .period {
    color: var(--c-text-3);
    font-size: var(--fs-sm);
    font-variant-numeric: tabular-nums;
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
  .legend .pt {
    position: static;
    width: 9px;
    height: 9px;
    transform: none;
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

  .rows {
    position: relative;
  }
  .row {
    display: grid;
    grid-template-columns: var(--gutter) minmax(0, 1fr);
    padding: 0 var(--pad);
  }
  .row + .row {
    border-top: 1px solid var(--c-border);
  }
  .group {
    background: var(--c-surface-2);
  }
  .axis .lane {
    height: 30px;
  }
  .gutter {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 0 12px 0 0;
    border: 0;
    background: none;
    text-align: left;
  }
  button.gutter {
    cursor: pointer;
  }
  .sub {
    padding-left: 23px;
    color: var(--c-text-2);
  }
  .chev {
    display: grid;
    color: var(--c-text-3);
    transition: transform 0.15s;
  }
  .chev.open {
    transform: rotate(90deg);
  }
  .gname {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .group .gname {
    font-weight: 600;
  }
  .gcount {
    margin-left: auto;
    padding: 0 7px;
    border-radius: var(--r-pill);
    background: var(--c-slate-bg);
    color: var(--c-slate-fg);
    font-size: var(--fs-xs);
    font-weight: 600;
  }

  .lane {
    position: relative;
    height: 46px;
  }
  .lane.active {
    z-index: 5;
  }
  .grid {
    position: absolute;
    top: 0;
    bottom: 0;
    left: calc(var(--gutter) + var(--pad));
    right: var(--pad);
    pointer-events: none;
  }
  .tick {
    position: absolute;
    top: 0;
    bottom: 0;
    border-left: 1px dashed var(--c-border);
  }
  .tick.major {
    border-left: 1px solid var(--c-border-strong);
  }
  .tick i {
    position: absolute;
    top: 7px;
    left: 6px;
    color: var(--c-text-3);
    font-size: var(--fs-xs);
    font-style: normal;
    white-space: nowrap;
  }
  .tick.major i {
    color: var(--c-text-2);
    font-weight: 600;
  }

  .pt {
    position: absolute;
    top: 50%;
    width: var(--d);
    height: var(--d);
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: #c3c8d4;
    transform: translate(-50%, -50%);
  }
  .pt.primary {
    background: var(--c-primary);
  }
  .pt.green {
    background: #2e9e6b;
  }
  .pt.amber {
    background: #e2a23a;
  }
  button.pt {
    cursor: pointer;
    transition: box-shadow 0.12s;
  }
  button.pt:hover,
  button.pt.on {
    box-shadow:
      0 0 0 4px var(--c-surface),
      0 0 0 6px var(--c-primary-border);
  }

  .pop {
    position: absolute;
    top: calc(50% + 16px);
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
    padding-top: var(--s-3);
    padding-bottom: var(--s-4);
    border-top: 1px solid var(--c-border);
  }
  .track {
    position: relative;
    height: 36px;
    background: repeating-linear-gradient(
        to right,
        var(--c-border-strong) 0 2px,
        transparent 2px calc(100% / var(--weeks))
      )
      center / 100% 14px no-repeat;
    cursor: pointer;
  }
  .window {
    position: absolute;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 6px;
    border: 1px solid var(--c-border-strong);
    border-radius: var(--r-md);
    background: var(--c-surface);
    box-shadow: var(--shadow-sm);
    color: var(--c-text-3);
    font-weight: 600;
    white-space: nowrap;
    cursor: grab;
    touch-action: none;
    user-select: none;
  }
  .window span {
    color: var(--c-text);
  }
  .window.dragging {
    cursor: grabbing;
    border-color: var(--c-primary);
    box-shadow: 0 0 0 3px var(--c-primary-soft);
  }
  .months {
    position: relative;
    height: 20px;
    margin-top: 6px;
    color: var(--c-text-3);
    font-size: var(--fs-sm);
  }
  .months span {
    position: absolute;
    padding-left: 4px;
    border-left: 1px solid var(--c-border-strong);
  }

  @media (max-width: 720px) {
    .scatter {
      --gutter: 132px;
      --pad: var(--s-3);
    }
    .gutter :global(.avatar) {
      display: none;
    }
    .sub {
      padding-left: 12px;
    }
  }
</style>
