import OrgCard from '../lib/OrgCard.svelte';

// The card shows finished text. A screen builds that text from data in the viewer's language.
export default {
  title: 'Components/OrgCard',
  parameters: { notes: 'orgcard' },
  component: OrgCard,
  args: {
    name: 'Lanna Medical Group',
    badge: { tone: 'amber', label: '2 awaiting confirmation' },
    value: 7,
    unit: 'open',
    latest: '#1042 PACS server upgrade · 12 minutes ago',
    meta: '3 in progress',
  },
};

export const AwaitingConfirmation = {};
export const PastDue = {
  args: { name: 'Andaman Hospital', badge: { tone: 'red', label: '1 past due' }, value: 4, meta: '2 in progress' },
};
export const AllConfirmed = {
  args: { name: 'Isan Regional Hospital', badge: { tone: 'green', label: 'All confirmed' }, value: 0, meta: '18 done this year' },
};
export const Internal = {
  name: 'Internal (no Customer)',
  args: { name: 'PSP internal', internal: true, badge: { tone: 'violet', label: 'No Customer' }, value: 5 },
};
