import OrgCard from '../lib/OrgCard.svelte';
import { organizations } from '../lib/mock.js';

export default { title: 'Components/OrgCard', component: OrgCard, args: organizations[0] };

export const AwaitingConfirmation = {};
export const PastDue = { args: organizations[1] };
export const AllConfirmed = { args: organizations[3] };
export const Internal = { name: 'Internal (no Customer)', args: organizations[7] };
