i would like to have something like google forms self hosted. for that i would like to have a react frontend (without tailwind) and a pocketbase Backend. I want two static pages. one that is the editor. and one that is the viewer.

let us right now start with the editor page. i want to be able to create a form with different types of questions (text, multiple choice, checkboxes). i also want to be able to save the form to the pocketbase backend. with a login system in place and multi user.

please look at the docker-compose.yml and docker-compose.dev.yml files. these are stubs how the docker setup should look like. but please use vite.

also have a look at style.scss to get an idea of the styling i want. please use BEM for the class naming convention. but don't set for everything a class-name. usualy we should be fine with styling the tags correct and uniform. DON'T USE tailwind. but use CSS variables for colors and spacing. make helper classes for margins and paddings. use them only when necessary. first try to have sensible tag-stylings that work globally. only when we have a specific case where we need to deviate from the global styling, we should use classes.

## Goal

- Build a **self-hosted form editor** similar to Google Forms.
- Focus only on the **editor UI and editor behavior**, not form filling, analytics, auth, or backend processing.
- Use the term **block** instead of **section** everywhere in UI, config, and documentation.

## Editor Scope

- Support creating, editing, deleting, duplicating, collapsing, and reordering:
  - form title and description
  - questions
  - blocks

- Allow multiple blocks per form.
- Each block must have:
  - title
  - optional description
  - ordered list of questions

## Question Editing

- Support at least:
  - short text
  - paragraph
  - single choice
  - multiple choice
  - dropdown

- For choice-based questions, allow:
  - add/edit/delete/reorder options
  - optional “Other” option to allow custom input from respondents
  - required toggle

- Allow drag-and-drop reordering of questions within a block.

## Block Flow Logic

- Support flow control between **blocks** similar to Google Forms section flow.
- Each block must have an **“After block”** rule with these options:
  - continue to next block
  - go to a specific block
  - submit form

- For single-choice and dropdown questions, allow per-option navigation rules:
  - continue to next block
  - go to a specific block
  - submit form

- Prevent invalid flows where possible:
  - no broken references
  - handle deleted target blocks safely

- Show flow settings clearly in the editor.

## Editor UX

- Make the editor fast and easy to scan.
- Keep block boundaries visually clear.
- Allow adding a new question or a new block
- Preserve a simple Google-Forms-like editing experience.
- Autosave changes locally or through API-ready state handling.

## Data / State Requirements

- Use a structured form model with stable IDs for:
  - form
  - blocks
  - questions
  - options

- Store block-level and option-level navigation as explicit rules.
- Make the model easy to persist and easy to validate.

## Non-Goals

- Do not implement respondent-facing runtime.
- Do not implement submissions, reports, permissions, theming, or integrations.
- Do not implement advanced logic beyond block navigation.
