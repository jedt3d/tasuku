import ActivityScatter from '../lib/ActivityScatter.svelte';
import { activityLegend, activityRange, allActivity, lannaActivity } from '../lib/mock.js';

export default {
  title: 'Components/ActivityScatter',
  component: ActivityScatter,
  args: { title: 'Support activity', groups: [lannaActivity], legend: activityLegend, ...activityRange },
  argTypes: { range: { control: 'inline-radio', options: ['30 days', '90 days', 'All time'] } },
};

export const Collapsed = { name: 'Organization (collapsed, dots not clickable)' };
export const Expanded = {
  name: 'Expanded into Customers',
  args: { expanded: ['Lanna Medical Group'] },
};
export const EventSelected = {
  name: 'Event card open',
  args: { expanded: ['Lanna Medical Group'], selected: 'Lanna Medical Group/Anan Kittisak/6' },
};
export const AllOrganizations = {
  args: { title: 'Activity by Organization', groups: allActivity, expanded: ['Andaman Hospital'] },
};
export const AllTime = { args: { groups: allActivity, range: 'All time' } };
