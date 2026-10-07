import Composer from '../lib/Composer.svelte';

export default { title: 'Components/Composer', parameters: { notes: 'composer' }, component: Composer };

export const Staff = {};
export const Customer = { args: { placeholder: 'Reply to PSP…' } };
export const ReadOnly = {
  args: { disabled: true, disabledReason: 'Only the Owner and Collaborators can comment on this Task.' },
};
