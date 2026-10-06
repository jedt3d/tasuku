import QuickAction from '../lib/QuickAction.svelte';

export default {
  title: 'Components/QuickAction',
  component: QuickAction,
  args: { icon: 'userPlus', label: 'Add Collaborator' },
  argTypes: { tone: { control: 'inline-radio', options: ['default', 'danger'] } },
};

export const Default = {};
export const Danger = { args: { icon: 'ban', label: 'Cancel Task', tone: 'danger' } };
export const Disabled = { args: { icon: 'swap', label: 'Reassign Owner', disabled: true } };
