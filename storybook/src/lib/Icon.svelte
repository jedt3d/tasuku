<script>
  import { icons } from './icons.js';

  let { name, size = 18, stroke = 1.75 } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width={name === 'more' ? 2.6 : stroke}
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <path d={icons[name] ?? ''} />
</svg>

<style>
  svg {
    flex: none;
    display: block;
  }
</style>
