import Tabs from '../lib/Tabs.svelte';

export default {
  title: 'Components/Tabs', parameters: { notes: 'tabs' },
  component: Tabs,
  args: {
    active: 'all',
    items: [
      { id: 'all', label: 'All Tasks' },
      { id: 'open', label: 'Open', count: 6 },
      { id: 'in_progress', label: 'In progress', count: 14 },
      { id: 'resolved', label: 'Resolved', count: 4 },
      { id: 'done', label: 'Done' },
    ],
  },
  argTypes: { variant: { control: 'inline-radio', options: ['pill', 'underline'] } },
};

export const Pill = {};
export const Underline = {
  args: {
    variant: 'underline',
    active: 'organizations',
    items: [
      { id: 'organizations', label: 'By Organization' },
      { id: 'all', label: 'All Tasks' },
      { id: 'mine', label: 'My Tasks', count: 5 },
    ],
  },
};
