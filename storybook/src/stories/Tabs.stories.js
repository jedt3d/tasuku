import Tabs from '../lib/Tabs.svelte';
import { statusCounts } from '../lib/mock.js';

export default {
  title: 'Components/Tabs',
  component: Tabs,
  args: { items: statusCounts, active: 'all' },
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
