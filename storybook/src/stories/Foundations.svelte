<script>
  import Icon from '../lib/Icon.svelte';
  import { icons } from '../lib/icons.js';

  let { section = 'colors' } = $props();

  const neutrals = ['bg', 'surface', 'surface-2', 'border', 'border-strong', 'text-3', 'text-2', 'text'];
  const brand = ['primary', 'primary-hover', 'primary-text', 'primary-soft', 'primary-faint', 'primary-border'];
  const tones = ['slate', 'blue', 'amber', 'green', 'red', 'violet'];
  const sizes = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const radii = ['sm', 'md', 'lg', 'xl', 'pill'];
  const shadows = ['sm', 'md', 'lg'];
  const spaces = [1, 2, 3, 4, 5, 6, 8];
</script>

{#if section === 'colors'}
  <h2>Brand</h2>
  <div class="grid">
    {#each brand as name (name)}
      <div class="swatch"><span style="background:var(--c-{name})"></span><code>--c-{name}</code></div>
    {/each}
  </div>
  <h2>Neutrals</h2>
  <div class="grid">
    {#each neutrals as name (name)}
      <div class="swatch"><span style="background:var(--c-{name})"></span><code>--c-{name}</code></div>
    {/each}
  </div>
  <h2>Tones</h2>
  <p>Each tone is a pair: a tinted background and a foreground that stays readable on it.</p>
  <div class="grid">
    {#each tones as name (name)}
      <div class="swatch">
        <span class="pair" style="background:var(--c-{name}-bg);color:var(--c-{name}-fg)">Aa</span>
        <code>--c-{name}-bg / -fg</code>
      </div>
    {/each}
  </div>
{:else if section === 'type'}
  <h2>Two roles</h2>
  <div class="roles">
    <div class="role">
      <code>--font-text</code>
      <p style="font-family:var(--font-text)">
        ตัวอักษรไทยแบบมีหัว สำหรับข้อความที่ต้องอ่านหรือพิมพ์ยาว ๆ เช่น comment และรายละเอียดของ Task
        ผู้ใช้แยกตัว ถ ภ ฎ ฏ ด ต ค ศ ออกจากกันได้ทันที
      </p>
      <p style="font-family:var(--font-text)">Text you read at length · 長く読む文章のための書体</p>
    </div>
    <div class="role">
      <code>--font-display</code>
      <p style="font-family:var(--font-display);font-weight:600">
        ตัวอักษรไทยแบบไม่มีหัว สำหรับหัวข้อ ปุ่ม และ label สั้น ๆ: ถ ภ ฎ ฏ ด ต ค ศ
      </p>
      <p style="font-family:var(--font-display);font-weight:600">Titles, buttons, labels · 見出し・ボタン・ラベル</p>
    </div>
  </div>
  <h2>Type scale</h2>
  {#each sizes as size (size)}
    <div class="type">
      <code>--fs-{size}</code>
      <span
        style="font-size:var(--fs-{size});font-weight:{size.includes('xl') ? 700 : 400};font-family:var(--font-{size.includes(
          'xl',
        )
          ? 'display'
          : 'text'})">Task opened · เปิด Task แล้ว · タスクを開きました</span
      >
    </div>
  {/each}
{:else if section === 'shape'}
  <h2>Radius</h2>
  <div class="grid">
    {#each radii as name (name)}
      <div class="swatch"><span class="box" style="border-radius:var(--r-{name})"></span><code>--r-{name}</code></div>
    {/each}
  </div>
  <h2>Shadow</h2>
  <div class="grid">
    {#each shadows as name (name)}
      <div class="swatch"><span class="box plain" style="box-shadow:var(--shadow-{name})"></span><code>--shadow-{name}</code></div>
    {/each}
  </div>
  <h2>Spacing</h2>
  {#each spaces as n (n)}
    <div class="type"><code>--s-{n}</code><span class="bar" style="width:var(--s-{n})"></span></div>
  {/each}
{:else}
  <h2>Icons</h2>
  <div class="grid icons">
    {#each Object.keys(icons) as name (name)}
      <div class="icon"><Icon {name} size={22} /><code>{name}</code></div>
    {/each}
  </div>
{/if}

<style>
  h2 {
    margin: 24px 0 8px;
    font-size: var(--fs-lg);
  }
  h2:first-child {
    margin-top: 0;
  }
  p {
    margin: 0 0 12px;
    color: var(--c-text-3);
  }
  code {
    font-size: var(--fs-xs);
    color: var(--c-text-2);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
  }
  .swatch,
  .icon {
    display: grid;
    gap: 6px;
  }
  .swatch span {
    display: grid;
    place-items: center;
    height: 64px;
    border: 1px solid var(--c-border);
    border-radius: var(--r-md);
    font-weight: 600;
    font-size: var(--fs-lg);
  }
  .box {
    background: var(--c-primary-soft);
    border-color: var(--c-primary-border) !important;
  }
  .box.plain {
    background: var(--c-surface);
    border-radius: var(--r-md);
  }
  .type {
    display: grid;
    grid-template-columns: 90px 1fr;
    align-items: center;
    gap: 16px;
    padding: 8px 0;
    border-bottom: 1px solid var(--c-border);
  }
  .roles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 12px;
  }
  .role {
    padding: 16px;
    border: 1px solid var(--c-border);
    border-radius: var(--r-md);
    background: var(--c-surface);
  }
  .role p {
    margin: 8px 0 0;
    color: var(--c-text);
    font-size: var(--fs-lg);
  }
  .bar {
    height: 16px;
    border-radius: 3px;
    background: var(--c-primary);
  }
  .icons {
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  }
  .icon {
    justify-items: center;
    padding: 14px 6px;
    border: 1px solid var(--c-border);
    border-radius: var(--r-md);
    background: var(--c-surface);
  }
</style>
