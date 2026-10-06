<script>
  import Button from '../lib/Button.svelte';
  import Field from '../lib/Field.svelte';
  import SlideOver from '../lib/SlideOver.svelte';

  let { title = 'Add Collaborator', subtitle = 'They can comment and attach files on this Task.', width = 420 } = $props();
  let open = $state(true);
</script>

<p>The page stays visible and usable behind the panel. <Button size="sm" label="Open panel" onclick={() => (open = true)} /></p>

<SlideOver {open} {title} {subtitle} {width} onclose={() => (open = false)}>
  <Field label="Staff member" type="select" icon="user" options={['Nicha Wong', 'Kenji Tanaka', 'Arthit Boonmee']} />
  {#snippet footer()}
    <Button label="Cancel" onclick={() => (open = false)} />
    <Button variant="primary" label="Add to Task" />
  {/snippet}
</SlideOver>
