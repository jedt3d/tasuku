import ActivityScatter from '../lib/ActivityScatter.svelte';
import { activity } from '../lib/mock.js';

export default {
  title: 'Components/ActivityScatter',
  component: ActivityScatter,
  args: {
    title: 'Support activity',
    points: activity,
    months: ['August', 'September', 'October'],
    legend: [
      { tone: 'primary', label: 'Task opened' },
      { tone: '', label: 'Comment or event' },
      { tone: 'amber', label: 'Resolved' },
      { tone: 'green', label: 'Done' },
    ],
  },
};

export const Default = {};
export const DaySelected = { args: { selected: 10 } };
