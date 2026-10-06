import Timeline from '../lib/Timeline.svelte';
import ActivityLogDemo from './ActivityLogDemo.svelte';
import { task } from '../lib/mock.js';

export default {
  title: 'Components/Timeline',
  component: Timeline,
  args: { entries: task.timeline },
  argTypes: { viewer: { control: 'inline-radio', options: ['staff', 'customer'] } },
};

export const StaffView = { name: 'Staff view (with Threads)' };
export const CustomerView = { name: 'Customer view (no Threads)', args: { viewer: 'customer' } };
export const Cards = { name: 'Comments as cards', args: { cards: true, viewer: 'customer' } };
export const ActivityLog = { render: (args) => ({ Component: ActivityLogDemo, props: { viewer: args.viewer } }) };
