import TopBar from '../lib/TopBar.svelte';

export default { title: 'Components/TopBar', component: TopBar, parameters: { layout: 'fullscreen' } };

export const Staff = {};
export const Customer = { args: { minimal: true, user: 'Dr. Ploy Suwan' } };
export const SignedOut = { args: { minimal: true, user: '' } };
