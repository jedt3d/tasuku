import Field from '../lib/Field.svelte';

export default {
  title: 'Components/Field',
  component: Field,
  args: { label: 'Title', placeholder: 'What needs to be done?' },
  argTypes: { type: { control: 'select', options: ['text', 'email', 'date', 'select', 'textarea'] } },
  parameters: { layout: 'centered', notes: 'field' },
};

export const Text = {};
export const WithIconAndHint = {
  args: {
    label: 'Customer email',
    type: 'email',
    icon: 'mail',
    placeholder: 'name@example.com',
    action: 'Optional',
    hint: 'One Customer per Task.',
  },
};
export const Select = {
  args: { label: 'Organization', type: 'select', icon: 'building', options: ['Lanna Medical Group', 'Andaman Hospital'] },
};
export const Textarea = { args: { label: 'Description', type: 'textarea', placeholder: 'Context, steps…' } };
