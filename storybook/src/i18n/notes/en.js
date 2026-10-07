// Design notes: what each piece is for and why it looks the way it does.
// Text between `backticks` is shown as code.
export default {
  labels: {
    notes: 'Design notes',
    purpose: 'Purpose',
    why: 'Why it is designed this way',
    use: 'How to use it',
  },

  colors: {
    title: 'Colours',
    purpose:
      'The whole colour vocabulary of Tasuku, as CSS variables. Components read these and never hard-code a colour.',
    why: [
      'Both themes share one set of names, so a component is written once and works in light and dark.',
      'The dark theme follows One Dark: slate greys, never pure black. Pure black against bright text tires the eyes over a full working day; a dark grey keeps contrast high but comfortable.',
      'Every tone is a pair, a tinted background and a foreground that is readable on it, so a badge or an avatar never needs a third colour.',
      'Indigo is the only brand colour. It marks the one primary action on a screen and the place you are, nothing else.',
    ],
    use: [
      'Put cards on `--c-surface` over a page of `--c-bg`. Use `--c-text-3` only for secondary information.',
      'Use a tone for meaning, never for decoration: amber is waiting on someone, green is finished, red is a problem or a destructive action.',
      'For indigo text on a surface use `--c-primary-text`, not `--c-primary`: it is tuned per theme to stay readable.',
    ],
  },

  type: {
    title: 'Typography',
    purpose: 'The type scale and the two font roles: text and display.',
    why: [
      'Thai has two letterform styles. Looped letters are the ones people learn to read with and stay legible in long passages; loopless letters look modern but several of them become hard to tell apart at small sizes.',
      'So anything that is read or typed at length (comments, descriptions, every input) uses a looped Thai face. Loopless Thai is kept for short pieces: titles, buttons, tabs and badges.',
      'Inter for Latin, Noto Sans Thai Looped and Noto Sans Thai for Thai, Noto Sans JP for Japanese: they share proportions and weights, so mixed-language lines sit evenly.',
      'Six sizes only. Fewer sizes make the hierarchy obvious.',
    ],
    use: [
      '`--font-text` is the default for everything. `--font-display` is applied to headings and buttons automatically, and by components to their labels.',
      'Thai lines are set taller than Latin ones, because vowels and tone marks sit above and below the line.',
    ],
  },

  shape: {
    title: 'Radius, shadow, spacing',
    purpose: 'The scales that give surfaces their shape and rhythm.',
    why: [
      'Thin borders and soft corners separate surfaces. Shadow is reserved for things that float above the page: a popover or the side panel.',
      'Spacing moves in steps of 4 px, so components line up with each other without extra effort.',
    ],
    use: ['Cards use `--r-lg`, controls use `--r-md`, pills and badges use `--r-pill`.'],
  },

  icons: {
    title: 'Icons',
    purpose: 'Stroke icons on a 24 px grid, drawn for Tasuku.',
    why: [
      'One stroke weight and rounded ends, to match the weight of the text beside them.',
      'An icon is never the only label of an action that changes data. It accompanies words.',
    ],
    use: ['`<Icon name="thread" />`. To add an icon, add a path to `icons.js`.'],
  },

  button: {
    title: 'Button',
    purpose: 'Triggers an action.',
    why: [
      'One primary button per screen. It is the next step the viewer is expected to take, such as Mark Resolved.',
      'Danger is outlined, not filled: a destructive action is clearly marked without competing with the primary one.',
      'Soft and ghost are for actions inside a card or a section, where a full button would be too loud.',
    ],
    use: [
      'Labels are verbs, and they use the glossary terms exactly: Mark Resolved, Reopen, Cancel Task.',
      'If a viewer may never use an action, leave the button out. Disable it only when it will become available.',
    ],
  },

  badge: {
    title: 'Badge',
    purpose: 'Shows a status or a short count.',
    why: [
      'Each Task status has a fixed tone, so it is recognised before it is read: slate for Open, blue for In progress, amber for Resolved, green for Done, red for Cancelled.',
      'Amber for Resolved is deliberate. The work is proposed as finished but is still waiting for someone to confirm.',
    ],
    use: ['Pass `status` for a Task or Thread status. Pass `tone` and `label` for anything else.'],
  },

  avatar: {
    title: 'Avatar',
    purpose: 'Identifies a person or an Organization by initials.',
    why: [
      'Tasuku stores no photos. Initials on a stable tint are enough to tell people apart in a Timeline.',
      'The tint is derived from the name, so the same person has the same colour everywhere.',
    ],
    use: ['Pass `name`. Pass `tone` only when a colour has to be fixed.'],
  },

  tabs: {
    title: 'Tabs',
    purpose: 'Switches between filters or views of the same content.',
    why: [
      'Two styles with two meanings. Pill tabs filter a list in place; underline tabs switch to a different view of the page. The style tells the viewer which will happen.',
      'A count appears only where a number helps decide where to look.',
    ],
    use: ['`variant="pill"` on a toolbar, `variant="underline"` directly under a page header.'],
  },

  field: {
    title: 'Field',
    purpose: 'A labelled input: text, email, date, select or textarea.',
    why: [
      'The label is always visible above the control. A placeholder is an example, never the label.',
      'Whatever is typed uses the text font, so Thai is entered and read in looped letters.',
      'Optional fields say so on the label line, instead of marking the required ones, because most fields here are optional.',
    ],
    use: ['Put a rule the person needs before typing in `hint`, not in an error shown afterwards.'],
  },

  composer: {
    title: 'Composer',
    purpose: 'Where a comment is written and files are attached.',
    why: [
      'Attaching a file is part of writing a comment, so the paperclip lives here and nowhere else.',
      'The patient-data warning sits beside the paperclip, at the moment it matters: hospital Customers attach screenshots.',
      'When the viewer may not comment, the composer stays in place and says why, instead of disappearing.',
    ],
    use: ['Pass `disabled` with a `disabledReason` for Staff who are not on the Task.'],
  },

  timeline: {
    title: 'Timeline',
    purpose: 'The single history of a Task: comments and events in time order.',
    why: [
      'One line, read from top to bottom, is exactly what the Customer sees. It is the record both sides rely on.',
      'A Thread is an internal sub-task that starts from a point on the Timeline, so it is drawn branching off the entry it came from, with a dashed border and a lock: clearly attached, clearly not on the main line.',
      'Events are small and comments are large. People come for the conversation; events give it context.',
      'Start Thread sits on the entry itself, shown on hover and always shown on touch screens. A hidden gesture such as right-click or long-press would not be discoverable and cannot be reached by keyboard.',
    ],
    use: [
      '`viewer="customer"` never receives Threads.',
      '`actions` turns on Start Thread and Thread replies, for Staff who may write on the Task.',
      '`cards` puts each comment in a card, for a denser activity log.',
    ],
  },

  orgcard: {
    title: 'OrgCard',
    purpose: 'Summarises one Organization on the Overview.',
    why: [
      'One large number answers "how much is open here". The badge answers "does it need me".',
      'The whole card is a single button, because there is one thing to do with it: open the Organization.',
    ],
    use: ['The headline number is whatever the page is counting; pass its unit in `unit`.'],
  },

  activityscatter: {
    title: 'ActivityScatter',
    purpose: 'The Timeline condensed to its events, across many Tasks.',
    why: [
      'Rows are Organizations, so workload is compared at a glance. A row expands into its Customers to show whom the activity belongs to.',
      'Dots on an Organization row are a summary and cannot be clicked. Dots on a Customer row are single events and open a card.',
      'Horizontal position is the date. The window on the scrubber slides along the same axis as the ticks, so what you drag is what you see.',
      'Any click closes the card, so looking through many dots stays quick.',
    ],
    use: [
      'Pass `groups` (Organizations) with `rows` (Customers) and their `points`, plus the `from` and `to` dates.',
      'When dots crowd together, switch to 30 days: the same events spread out.',
    ],
  },

  topbar: {
    title: 'TopBar',
    purpose: 'The application header: logo, navigation, language and the signed-in person.',
    why: [
      'Language is always one click away, because Staff and Customers do not share one language.',
      'Customers get the same bar without navigation. They have one place to be.',
      'The logo is an SVG file, so the brand can change without touching code.',
    ],
    use: [
      'Replace `src/assets/logo.svg` to change the logo. Set `wordmark={false}` when the SVG already contains the name.',
      'Pass `minimal` for Customers and for the sign-in page.',
    ],
  },

  slideover: {
    title: 'SlideOver',
    purpose: 'A side panel for a short task that should not lose the page behind it.',
    why: [
      'It slides in from the right and leaves the page visible and usable, so the viewer keeps their place in the list.',
      'It is for peeking at a Task and for short forms. Anything longer deserves its own page.',
    ],
    use: ['Put the confirming action in the `footer`, with Cancel to its left.'],
  },

  signin: {
    title: 'Sign in',
    purpose: 'Passwordless sign-in for Staff and Customers.',
    why: [
      'One field. There is no password to forget and no account to create.',
      'The same page serves everyone. What a person may see is decided after they sign in.',
    ],
    use: ['The language switch is available before signing in.'],
  },

  overview: {
    title: 'Overview',
    purpose: 'The Staff landing page. It answers: where is work waiting?',
    why: [
      'Work is grouped by Organization, because that is how PSP thinks about the Customers it supports.',
      'Status filters stay at the top of every view, so "what is open" is always one click away.',
      'Activity shows the same Organizations over time, for noticing who has gone quiet and who is suddenly busy.',
      'New Task opens in a side panel, so opening one never loses the list.',
    ],
    use: ['Internal work with no Customer appears as its own card, marked "No Customer".'],
  },

  organization: {
    title: 'Organization',
    purpose: 'Everything that has happened for one Organization.',
    why: [
      'Four numbers first, then activity over time, then the Tasks: from summary to detail.',
      'Clicking a Task or an event peeks at it in the side panel. The full Task is one more click.',
    ],
    use: ['An Organization is a label for grouping. It never decides who can see a Task.'],
  },

  task: {
    title: 'Task (Staff)',
    purpose: 'The working view of one Task for Staff.',
    why: [
      'People on the left, conversation on the right: first who is responsible, then what was said.',
      'Closing actions are at the top right and appear only for those who may use them. A read-only viewer sees a notice in the same place.',
      'Each People section carries its own action on its title line, so the button sits next to what it changes.',
      'Every Staff member can read every Task, so read-only is a normal state here, not an error.',
    ],
    use: ['The stories show the same Task as Owner, Collaborator, Task Master and as Staff who are not on it.'],
  },

  customertask: {
    title: 'Task (Customer)',
    purpose: 'What a Customer sees for their one Task, designed for a phone first.',
    why: [
      'Customers arrive from an email link, often on a phone, and are not trained users: one column, one Timeline, no Threads.',
      'When PSP proposes closing, the question and its two answers take over the top of the screen: Done or Reopen. "Reopen" was chosen over "Reject" because it is not a judgement.',
      'Mark as Done and Cancel are always available but quiet, because they are rare.',
    ],
    use: ['The phone frame is only for viewing on a desktop canvas; pass `framed={false}` to fill the screen.'],
  },
};
