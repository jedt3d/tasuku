import CustomerTaskScreen from '../screens/CustomerTaskScreen.svelte';
import OrganizationScreen from '../screens/OrganizationScreen.svelte';
import OverviewScreen from '../screens/OverviewScreen.svelte';
import SignInScreen from '../screens/SignInScreen.svelte';
import TaskScreen from '../screens/TaskScreen.svelte';

// PROTOTYPE screens for the v1 spec (issue #1). Mock data, nothing is saved.
export default { title: 'Screens', parameters: { layout: 'fullscreen' } };

const screen = (Component, name, props = {}) => ({ name, render: () => ({ Component, props }) });

export const SignIn = screen(SignInScreen, '1 Sign in');
export const SignInSent = screen(SignInScreen, '1 Sign in · link sent', { sent: true });
export const Overview = screen(OverviewScreen, '2 Overview by Organization');
export const OverviewNewTask = screen(OverviewScreen, '2 Overview · New Task panel', { newTask: true });
export const Organization = screen(OrganizationScreen, '3 Organization activity');
export const OrganizationPeek = screen(OrganizationScreen, '3 Organization · Task peek', { peek: true, selectedPoint: null });
export const TaskOwner = screen(TaskScreen, '4 Task · Owner');
export const TaskResolved = screen(TaskScreen, '4 Task · Resolved, as Task Master', { status: 'resolved', role: 'taskmaster' });
export const TaskReadOnly = screen(TaskScreen, '4 Task · Staff not on the Task', { role: 'reader' });
export const CustomerTask = screen(CustomerTaskScreen, '5 Customer · In progress');
export const CustomerResolved = screen(CustomerTaskScreen, '5 Customer · asked to confirm', { status: 'resolved' });
