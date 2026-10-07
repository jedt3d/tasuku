import '../src/tokens.css';
import StoryFrame from '../src/stories/StoryFrame.svelte';

const choice = (title, icon, items) => ({ description: title, toolbar: { title, icon, items, dynamicTitle: true } });

/** @type { import('@storybook/svelte-vite').Preview } */
export default {
  // Toolbar switches: every story can be seen in either theme and in any of the three languages.
  globalTypes: {
    theme: choice('Theme', 'mirror', [
      { value: 'light', title: 'Light' },
      { value: 'dark', title: 'Dark (One Dark)' },
    ]),
    locale: choice('Language', 'globe', [
      { value: 'en', title: 'English' },
      { value: 'th', title: 'ไทย' },
      { value: 'ja', title: '日本語' },
    ]),
    notes: choice('Design notes', 'document', [
      { value: 'show', title: 'Notes: shown' },
      { value: 'hide', title: 'Notes: hidden' },
    ]),
  },
  initialGlobals: { theme: 'light', locale: 'en', notes: 'show' },
  decorators: [
    (_, { globals, parameters }) => ({
        Component: StoryFrame,
        props: {
          theme: globals.theme,
          locale: globals.locale,
          note: parameters.notes,
          show: globals.notes === 'show',
          fullscreen: parameters.layout === 'fullscreen',
        },
    }),
  ],
  parameters: {
    layout: 'padded',
    options: { storySort: { order: ['Foundations', 'Components', 'Prototypes', 'Localisation'] } },
  },
};
