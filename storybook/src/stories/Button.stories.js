import Button from '../lib/Button.svelte';

export default {
  title: 'Components/Button', parameters: { notes: 'button' },
  component: Button,
  args: { label: 'Mark Resolved' },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'soft', 'ghost', 'danger'] },
    size: { control: 'inline-radio', options: ['md', 'sm'] },
  },
};

export const Primary = { args: { variant: 'primary', icon: 'checkCircle' } };
export const Secondary = { args: { label: 'Reopen', icon: 'reopen' } };
export const Soft = { args: { variant: 'soft', label: 'Open Task' } };
export const Ghost = { args: { variant: 'ghost', label: 'Add Collaborator', icon: 'plus' } };
export const Danger = { args: { variant: 'danger', label: 'Cancel Task', icon: 'ban' } };
export const Small = { args: { size: 'sm', label: 'Peek' } };
export const Disabled = { args: { variant: 'primary', disabled: true } };
