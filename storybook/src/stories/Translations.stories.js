import Translations from './Translations.svelte';

// For comparing translations. Read-only: this site cannot save back to GitHub.
export default {
  title: 'Localisation/Translations',
  component: Translations,
  parameters: { notes: 'translations' },
  argTypes: { set: { control: 'inline-radio', options: ['messages', 'notes'] } },
};

export const InterfaceText = { name: 'Interface text', args: { set: 'messages' } };
export const DesignNotes = { name: 'Design notes', args: { set: 'notes' } };
