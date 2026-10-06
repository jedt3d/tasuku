import CustomerTaskScreen from '../screens/CustomerTaskScreen.svelte';
import OrganizationScreen from '../screens/OrganizationScreen.svelte';
import OverviewScreen from '../screens/OverviewScreen.svelte';
import SignInScreen from '../screens/SignInScreen.svelte';
import TaskScreen from '../screens/TaskScreen.svelte';

// PROTOTYPE screens for the v1 spec (issue #1). Mock data, nothing is saved.
export default { title: 'Prototypes/Screens', parameters: { layout: 'fullscreen' } };

export const SignIn = { name: '1 Sign in', render: () => ({ Component: SignInScreen }) };
export const SignInSent = {
  name: '1 Sign in · link sent',
  render: () => ({ Component: SignInScreen, props: { sent: true } }),
};
export const Overview = { name: '2 Overview · by Organization', render: () => ({ Component: OverviewScreen }) };
export const OverviewActivity = {
  name: '2 Overview · Activity',
  render: () => ({ Component: OverviewScreen, props: { initialView: 'activity' } }),
};
export const OverviewNewTask = {
  name: '2 Overview · New Task panel',
  render: () => ({ Component: OverviewScreen, props: { newTask: true } }),
};
export const Organization = { name: '3 Organization · activity', render: () => ({ Component: OrganizationScreen }) };
export const OrganizationPeek = {
  name: '3 Organization · Task peek',
  render: () => ({ Component: OrganizationScreen, props: { peek: true, selectedPoint: null } }),
};
export const TaskOwner = { name: '4 Task · Owner', render: () => ({ Component: TaskScreen }) };
export const TaskCollaborator = {
  name: '4 Task · Collaborator',
  render: () => ({ Component: TaskScreen, props: { role: 'collaborator' } }),
};
export const TaskResolved = {
  name: '4 Task · Resolved, as Task Master',
  render: () => ({ Component: TaskScreen, props: { status: 'resolved', role: 'taskmaster' } }),
};
export const TaskReadOnly = {
  name: '4 Task · Staff not on the Task',
  render: () => ({ Component: TaskScreen, props: { role: 'reader' } }),
};
export const CustomerTask = { name: '5 Customer · In progress', render: () => ({ Component: CustomerTaskScreen }) };
export const CustomerResolved = {
  name: '5 Customer · asked to confirm',
  render: () => ({ Component: CustomerTaskScreen, props: { status: 'resolved' } }),
};
