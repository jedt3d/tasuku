import Badge from '../lib/Badge.svelte';

export default {
  title: 'Components/Badge', parameters: { notes: 'badge' },
  component: Badge,
  argTypes: {
    status: { control: 'select', options: ['open', 'in_progress', 'resolved', 'done', 'cancelled', 'settled'] },
    tone: { control: 'select', options: ['slate', 'blue', 'amber', 'green', 'red', 'violet'] },
  },
};

export const Open = { args: { status: 'open' } };
export const InProgress = { args: { status: 'in_progress' } };
export const Resolved = { args: { status: 'resolved' } };
export const Done = { args: { status: 'done' } };
export const Cancelled = { args: { status: 'cancelled' } };
export const CustomTone = { args: { tone: 'amber', label: '2 awaiting confirmation', caps: true } };
