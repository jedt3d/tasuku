# Tasuku Storybook

The design system for Tasuku: design tokens, Svelte components, and prototype screens for the
v1 spec ([#1](https://github.com/jedt3d/tasuku/issues/1)).

Published at <https://jedt3d.github.io/tasuku/> on every push to `main` that touches this folder.

## Run

```bash
npm install
npm run storybook        # http://localhost:6006
npm run build-storybook  # static site in storybook-static/
npm run check-i18n       # fails if the three languages drift apart
```

## Toolbar

Every story can be viewed with three switches in the Storybook toolbar:

- **Theme**: Light, or Dark. The dark theme follows One Dark: slate greys, never pure black.
- **Language**: English (default), ไทย, 日本語.
- **Design notes**: the purpose and the reasoning behind each component and screen, shown above
  the story in the chosen language.

## Layout

- `src/tokens.css`: colours, type, radius, shadow and spacing as CSS variables, for both themes.
  Components never hard-code a colour.
- `src/lib/`: components. Plain Svelte 5 and scoped CSS; no UI framework, no icon library.
- `src/i18n/`: interface text (`en.js`, `th.js`, `ja.js`) and the `t()` function. No text lives in
  a component.
- `src/i18n/notes/`: the design notes, in the same three languages.
- `src/screens/`: **prototype** screens assembled from the components. Mock data, nothing is saved.
  They show what the screens should look like; the real app rewrites them rather than importing them.
- `src/stories/`: one stories file per component, plus the prototype screens.
- `src/assets/logo.svg`: the logo shown in the top bar. Replace the file to change it.

## Writing rules

**Thai fonts.** Thai has looped and loopless letterforms. Anything read or typed at length
(comments, descriptions, inputs) uses the looped face through `--font-text`. The loopless face is
only for short display text (headings, buttons, tabs, badges) through `--font-display`. Never set
body text in a loopless Thai font.

**Translation.** In Thai, the domain terms of [`CONTEXT.md`](../CONTEXT.md) and the status names
stay in English (Task, Timeline, Thread, Owner, Resolved): people in technical work read them faster
than a translation. In Japanese they become the usual katakana loanwords (タスク, タイムライン).
Translate the sentence around the term, not the term.

**Reviewing translations.** The `Localisation/Translations` page lists every text in the three
languages side by side. It is for comparing only: the published site is read-only and cannot save
back to GitHub. To change a text, edit the language file (in an editor, or with the pencil icon on
GitHub) and commit; the site rebuilds itself. Change the text only, never a key or a `{placeholder}`.

**Mock data.** Every person and Organization in `src/lib/mock.js` is fictional. This repository is
public: never put real Customer data here.

The Thread shown on the Task screen is planned for a later release; it is drawn here so the Timeline
is designed with it in mind.
