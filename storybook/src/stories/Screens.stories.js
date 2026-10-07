import CustomerTaskScreen from '../screens/CustomerTaskScreen.svelte';
import OrganizationScreen from '../screens/OrganizationScreen.svelte';
import OverviewScreen from '../screens/OverviewScreen.svelte';
import SignInScreen from '../screens/SignInScreen.svelte';
import TaskScreen from '../screens/TaskScreen.svelte';

// PROTOTYPE screens for the v1 spec (issue #1). Mock data, nothing is saved.
export default { title: 'Prototypes/Screens', parameters: { layout: 'fullscreen' } };

export const SignIn = { name: '1 Sign in', render: () => ({ Component: SignInScreen, props: {} }),
  parameters: { notes: 'signin' }, };
export const SignInSent = {
  name: '1 Sign in · link sent',
  render: () => ({ Component: SignInScreen, props: { sent: true } }),
  parameters: { notes: 'signin' },
};
export const Overview = { name: '2 Overview · by Organization', render: () => ({ Component: OverviewScreen, props: {} }),
  parameters: { notes: 'overview' }, };
export const OverviewActivity = {
  name: '2 Overview · Activity',
  render: () => ({ Component: OverviewScreen, props: { initialView: 'activity' } }),
  parameters: { notes: 'overview' },
};
export const OverviewNewTask = {
  name: '2 Overview · New Task panel',
  render: () => ({ Component: OverviewScreen, props: { newTask: true } }),
  parameters: { notes: 'overview' },
};
export const Organization = { name: '3 Organization · activity', render: () => ({ Component: OrganizationScreen, props: {} }),
  parameters: { notes: 'organization' }, };
export const OrganizationPeek = {
  name: '3 Organization · Task peek',
  render: () => ({ Component: OrganizationScreen, props: { peek: true, selectedPoint: null } }),
  parameters: { notes: 'organization' },
};
export const TaskOwner = { name: '4 Task · Owner', render: () => ({ Component: TaskScreen, props: {} }),
  parameters: { notes: 'task' }, };
export const TaskCollaborator = {
  name: '4 Task · Collaborator',
  render: () => ({ Component: TaskScreen, props: { role: 'collaborator' } }),
  parameters: { notes: 'task' },
};
export const TaskResolved = {
  name: '4 Task · Resolved, as Task Master',
  render: () => ({ Component: TaskScreen, props: { status: 'resolved', role: 'taskmaster' } }),
  parameters: { notes: 'task' },
};
export const TaskReadOnly = {
  name: '4 Task · Staff not on the Task',
  render: () => ({ Component: TaskScreen, props: { role: 'reader' } }),
  parameters: { notes: 'task' },
};
export const CustomerTask = { name: '5 Customer · In progress', render: () => ({ Component: CustomerTaskScreen, props: {} }),
  parameters: { notes: 'customertask' }, };
export const CustomerResolved = {
  name: '5 Customer · asked to confirm',
  render: () => ({ Component: CustomerTaskScreen, props: { status: 'resolved' } }),
  parameters: { notes: 'customertask' },
};
