<script>
  // Tinted circle with initials. The tone is derived from the name, so a person keeps their colour.
  const tones = ['blue', 'red', 'amber', 'green', 'violet', 'slate'];

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
  const picked = $derived(
    tone ?? tones[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % tones.length],
  );
</script>

<span
  class="avatar"
  style="width:{size}px;height:{size}px;font-size:{Math.round(size * 0.38)}px;background:var(--c-{picked}-bg);color:var(--c-{picked}-fg)"
  title={name}>{initials}</span
>

<style>
  .avatar {
    flex: none;
    display: inline-grid;
    place-items: center;
    border-radius: 50%;
    font-family: var(--font-display);
    font-weight: 600;
    letter-spacing: 0.01em;
    user-select: none;
  }
</style>
