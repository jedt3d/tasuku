import '../src/tokens.css';

/** @type { import('@storybook/svelte-vite').Preview } */
export default {
  parameters: {
    layout: 'padded',
    options: { storySort: { order: ['Foundations', 'Components', 'Screens'] } },
  },
};
