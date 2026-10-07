import Timeline from '../lib/Timeline.svelte';
import ActivityLogDemo from './ActivityLogDemo.svelte';
import { task } from '../lib/mock.js';

export default {
  title: 'Components/Timeline', parameters: { notes: 'timeline' },
  component: Timeline,
  args: { entries: task.timeline },
  argTypes: { viewer: { control: 'inline-radio', options: ['staff', 'customer'] } },
};

export const StaffCanWrite = {
  name: 'Staff on the Task (hover an entry to start a Thread)',
  args: { actions: true },
};
export const StaffReadOnly = { name: 'Staff, read-only' };
export const CustomerView = { name: 'Customer (no Threads)', args: { viewer: 'customer' } };
export const Cards = { name: 'Comments as cards', args: { cards: true, viewer: 'customer' } };
export const ActivityLog = { render: (args) => ({ Component: ActivityLogDemo, props: { viewer: args.viewer } }) };
