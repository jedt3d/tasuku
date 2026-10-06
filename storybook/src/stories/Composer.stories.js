import Composer from '../lib/Composer.svelte';

export default { title: 'Components/Composer', component: Composer };

export const Customer = { args: { placeholder: 'Reply to PSP…' } };
export const Staff = {
  args: {
    targets: [
      { id: 'timeline', label: 'Timeline · Customer sees this' },
      { id: 'thread', label: 'Thread · Staff only' },
    ],
  },
};
export const StaffPostingToThread = { args: { ...Staff.args, target: 'thread' } };
export const ReadOnly = {
  args: { disabled: true, disabledReason: 'Only the Owner and Collaborators can comment on this Task.' },
};
