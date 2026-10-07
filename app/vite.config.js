import { fileURLToPath } from 'node:url';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import { localSupabase } from './scripts/local-supabase.mjs';

// Components, tokens and message catalogues have one source: the design system in ../storybook/src.
const ui = fileURLToPath(new URL('../storybook/src', import.meta.url));

export default defineConfig(({ command, mode, isPreview }) => {
  // A build takes VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY from the environment.
  // `vite dev` falls back to the local stack, so no keys are copied into files.
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const local = command === 'serve' && !isPreview && !env.VITE_SUPABASE_URL ? localSupabase() : null;
  if (command === 'build' && !(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_PUBLISHABLE_KEY))
    throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY before building.');

  return {
    define: local
      ? {
          'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(local.url),
          'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(local.publishableKey),
        }
      : {},
    resolve: { alias: { '@ui': ui }, dedupe: ['svelte'] },
    server: { port: 5173, strictPort: true, fs: { allow: [ui] } },
    // No page is prerendered, so the shell is index.html: the file the Cloudflare Worker serves
    // for every path (`not_found_handling: single-page-application`, docs/deploy.md).
    plugins: [sveltekit({ adapter: adapter({ fallback: 'index.html' }) })],
  };
});
