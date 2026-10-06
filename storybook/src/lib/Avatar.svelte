<script>
  // Tinted circle with initials. The tone is derived from the name so a person keeps their colour.
  const tones = [
    ['#e3e8ff', '#3b4fd6'],
    ['#ffe1e1', '#c93a3a'],
    ['#ffe8d2', '#b85a14'],
    ['#d9f0ff', '#1470ad'],
    ['#e4f6c8', '#4a7411'],
    ['#d3f4e4', '#127a52'],
    ['#f1e2ff', '#823bc6'],
  ];

  let { name = '', size = 36, tone } = $props();

  const initials = $derived(
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase(),
  );
  const pair = $derived(
    tones[(tone ?? [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)) % tones.length],
  );
</script>

<span
  class="avatar"
  style="width:{size}px;height:{size}px;font-size:{Math.round(size * 0.38)}px;background:{pair[0]};color:{pair[1]}"
  title={name}>{initials}</span
>

<style>
  .avatar {
    flex: none;
    display: inline-grid;
    place-items: center;
    border-radius: 50%;
    font-weight: 600;
    letter-spacing: 0.01em;
    user-select: none;
  }
</style>
