# Tasuku Storybook

The design system for Tasuku: design tokens, Svelte components, and prototype screens for the
v1 spec ([#1](https://github.com/jedt3d/tasuku/issues/1)).

Published at <https://jedt3d.github.io/tasuku/> on every push to `main` that touches this folder.

## Run

```bash
npm install
npm run storybook        # http://localhost:6006
npm run build-storybook  # static site in storybook-static/
```

## Layout

- `src/tokens.css`: colours, type, radius, shadow and spacing as CSS variables. Components never
  hard-code a colour.
- `src/lib/`: components. Plain Svelte 5 and scoped CSS; no UI framework, no icon library.
- `src/screens/`: **prototype** screens assembled from the components. Mock data, nothing is saved.
  They show what the screens should look like; the real app rewrites them rather than importing them.
- `src/stories/`: one stories file per component, plus the prototype screens.
- `src/assets/logo.svg`: the logo shown in the top bar. Replace the file to change it.

Every person and Organization in `src/lib/mock.js` is fictional. This repository is public: never
put real Customer data here.

Vocabulary follows [`CONTEXT.md`](../CONTEXT.md). The Thread shown on the Task screen is planned for
a later release; it is drawn here so the Timeline is designed with it in mind.
