import Avatar from '../lib/Avatar.svelte';

export default { title: 'Components/Avatar', component: Avatar, args: { name: 'Somchai Prasert', size: 40 } };

export const Staff = {};
export const Customer = { args: { name: 'Dr. Ploy Suwan' } };
export const Organization = { args: { name: 'Lanna Medical Group', size: 52 } };
export const Small = { args: { name: 'Kenji Tanaka', size: 24 } };
