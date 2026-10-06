/** @type { import('@storybook/svelte-vite').StorybookConfig } */
export default {
  stories: ['../src/**/*.stories.js'],
  framework: { name: '@storybook/svelte-vite', options: {} },
  core: { disableTelemetry: true },
};
