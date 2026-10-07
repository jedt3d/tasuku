<script>
  // Every text in the three languages, side by side. For comparing only: nothing here can be edited,
  // because this site is static and cannot save back to GitHub.
  import Icon from '../lib/Icon.svelte';
  import en from '../i18n/en.js';
  import ja from '../i18n/ja.js';
  import th from '../i18n/th.js';
  import { i18n } from '../i18n/index.svelte.js';
  import { notes } from '../i18n/notes/index.js';

  // set: 'messages' (interface text) or 'notes' (design notes)
  let { set = 'messages' } = $props();

  const repo = 'https://github.com/jedt3d/tasuku/blob/main/storybook/src/i18n/';
  const langs = [
    { code: 'en', name: 'English' },
    { code: 'th', name: 'ไทย' },
    { code: 'ja', name: '日本語' },
  ];

  // Design notes are nested (entry → field → text or list of lines); one row per text.
  const flatten = (catalogue) =>
    Object.fromEntries(
      Object.entries(catalogue).flatMap(([entry, fields]) =>
        Object.entries(fields).flatMap(([field, value]) =>
          Array.isArray(value)
            ? value.map((line, i) => [`${entry}.${field}.${i + 1}`, line])
            : [[`${entry}.${field}`, value]],
        ),
      ),
    );

  const sources = $derived(
    set === 'notes' ? { en: flatten(notes.en), th: flatten(notes.th), ja: flatten(notes.ja) } : { en, th, ja },
  );
  const dir = $derived(set === 'notes' ? 'notes/' : '');
  const label = $derived(notes[i18n.locale].translationsPage);

  let query = $state('');
  let sameOnly = $state(false);

  const placeholders = (text) => (text.match(/\{\w+\}/g) ?? []).sort().join();
  const rows = $derived(
    Object.keys(sources.en).map((key) => {
      const cells = langs.map((lang) => sources[lang.code][key] ?? '');
      return {
        key,
        cells,
        same: cells.map((cell) => cell === cells[0]),
        mismatch: cells.some((cell) => placeholders(cell) !== placeholders(cells[0])),
      };
    }),
  );
  const shown = $derived(
    rows.filter(
      (row) =>
        (!sameOnly || row.same.slice(1).some(Boolean)) &&
        (!query || [row.key, ...row.cells].some((text) => text.toLowerCase().includes(query.toLowerCase()))),
    ),
  );
</script>

<!-- Placeholders such as {name} are shown as chips, so a reviewer sees what must not be translated. -->
{#snippet rich(text)}
  {#each text.split(/(\{\w+\})/) as part, i (i)}{#if i % 2}<code class="var">{part}</code>{:else}{part}{/if}{/each}
{/snippet}

<div class="page">
  <aside class="notice" role="note">
    <span class="lock"><Icon name="lock" size={20} /></span>
    <div>
      <strong>{label.notice}</strong>
      <p>{label.how}</p>
      <p class="files">
        {label.files}:
        {#each langs as lang (lang.code)}
          <a href="{repo}{dir}{lang.code}.js" target="_blank" rel="noopener"
            >{lang.name} · {dir}{lang.code}.js <Icon name="arrowUpRight" size={13} /></a
          >
        {/each}
      </p>
    </div>
  </aside>

  <div class="bar">
    <label class="search">
      <Icon name="search" size={17} />
      <input bind:value={query} placeholder={label.search} />
    </label>
    <label class="check"><input type="checkbox" bind:checked={sameOnly} /> {label.sameOnly}</label>
    <span class="count">{label.count.replace('{shown}', shown.length).replace('{total}', rows.length)}</span>
  </div>

  <div class="wrap">
    <table>
      <thead>
        <tr>
          <th>{label.key}</th>
          {#each langs as lang (lang.code)}<th>{lang.name}</th>{/each}
        </tr>
      </thead>
      <tbody>
        {#each shown as row (row.key)}
          <tr>
            <th scope="row">
              <code>{row.key}</code>
              {#if row.mismatch}<span class="warn"><Icon name="warning" size={13} />{label.mismatch}</span>{/if}
            </th>
            {#each row.cells as cell, i (i)}
              <td lang={langs[i].code} class:same={i > 0 && row.same[i]}>
                {@render rich(cell)}
                {#if i > 0 && row.same[i]}<span class="eq" title={label.same}>= EN</span>{/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .page {
    display: grid;
    gap: var(--s-4);
  }
  .notice {
    display: flex;
    gap: var(--s-3);
    padding: var(--s-4);
    border: 1px solid var(--c-amber-fg);
    border-radius: var(--r-md);
    background: var(--c-amber-bg);
    color: var(--c-amber-fg);
  }
  .lock {
    flex: none;
    margin-top: 2px;
  }
  .notice strong {
    display: block;
    font-size: var(--fs-lg);
  }
  .notice p {
    margin: 4px 0 0;
  }
  .files {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 14px;
  }
  .files a {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: inherit;
    font-weight: 600;
  }

  .bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--s-3) var(--s-5);
  }
  .search {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 220px;
    max-width: 380px;
    height: 40px;
    padding: 0 12px;
    border: 1px solid var(--c-border-strong);
    border-radius: var(--r-md);
    background: var(--c-surface);
    color: var(--c-text-3);
  }
  .search input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    background: none;
    color: var(--c-text);
  }
  .check {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--c-text-2);
    cursor: pointer;
  }
  .count {
    margin-left: auto;
    color: var(--c-text-3);
    font-size: var(--fs-sm);
    font-variant-numeric: tabular-nums;
  }

  .wrap {
    overflow-x: auto;
    border: 1px solid var(--c-border);
    border-radius: var(--r-lg);
    background: var(--c-surface);
  }
  table {
    width: 100%;
    min-width: 760px;
    border-collapse: collapse;
    table-layout: fixed;
  }
  th,
  td {
    padding: 10px 14px;
    border-bottom: 1px solid var(--c-border);
    text-align: left;
    vertical-align: top;
    overflow-wrap: anywhere;
    /* Each cell sets its own line height: Thai cells are taller than the rest. */
    line-height: var(--lh);
  }
  tbody tr:last-child > * {
    border-bottom: 0;
  }
  thead th {
    position: sticky;
    top: 0;
    background: var(--c-surface-2);
    color: var(--c-text-3);
    font-family: var(--font-display);
    font-size: var(--fs-sm);
    font-weight: 600;
  }
  thead th:first-child {
    width: 22%;
  }
  tbody th {
    font-weight: 400;
  }
  code {
    font-size: var(--fs-xs);
    color: var(--c-text-2);
  }
  .var {
    padding: 1px 5px;
    border-radius: 5px;
    background: var(--c-primary-soft);
    color: var(--c-primary-text);
  }
  .same {
    color: var(--c-text-3);
  }
  .eq {
    margin-left: 6px;
    padding: 0 6px;
    border-radius: var(--r-pill);
    background: var(--c-slate-bg);
    color: var(--c-slate-fg);
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
  }
  .warn {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
    color: var(--c-red-fg);
    font-size: var(--fs-xs);
    font-weight: 600;
  }
</style>
