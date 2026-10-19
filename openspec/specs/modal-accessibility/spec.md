# modal-accessibility Specification

## Purpose

Dialog semantics, focus management, Escape dismissal, and status announcements for every modal dialog in
the app (`#downloadModal`, `#assistModal`). Introduced by change `harden-conversion-flow`, which found that
modal markup carried no accessibility semantics at all and that a modal opened from a button could not be
dismissed with the keyboard.

## Requirements

### Requirement: Dialog semantics

Each modal dialog MUST expose `role="dialog"`, `aria-modal="true"`, and an accessible name via
`aria-labelledby` pointing at its visible title.

#### Scenario: Modal exposes dialog semantics

- GIVEN a modal dialog in the document
- THEN it MUST carry `role="dialog"`
- AND it MUST carry `aria-modal="true"`
- AND its `aria-labelledby` MUST reference an existing element that contains its visible title

### Requirement: Focus entry on open

When a dialog opens, focus MUST move into the dialog.

#### Scenario: Opening the assist modal moves focus inside

- GIVEN the assist modal is closed and its trigger button is focused
- WHEN the trigger is activated
- THEN focus MUST be inside the dialog element

#### Scenario: Assist modal opened by pointer

- GIVEN the assist modal is closed and the trigger button is clicked
- WHEN the modal opens
- THEN focus MUST be inside the dialog element, not left on the trigger

### Requirement: Escape dismissal

`Escape` MUST close the currently open dialog, regardless of which element had focus when the dialog was
opened.

#### Scenario: Escape closes the assist modal opened from its trigger button

- GIVEN the assist modal was opened by activating its trigger button, with no click inside the dialog
- WHEN the user presses `Escape`
- THEN the modal MUST close
- AND it MUST NOT remain open waiting for a click inside it

#### Scenario: Escape closes the download modal

- GIVEN the download modal is open
- WHEN the user presses `Escape`
- THEN the modal MUST close

### Requirement: Focus restoration on close

When a dialog closes, focus MUST return to the element that opened it.

#### Scenario: Focus returns to the trigger

- GIVEN the assist modal was opened from its trigger button
- WHEN the modal closes by any route (button, `Escape`, or backdrop)
- THEN focus MUST return to the trigger button

### Requirement: Status announcements

Conversion result messages MUST be exposed through a live region so assistive technology announces them.

#### Scenario: Conversion error is announced

- GIVEN `#convertAlert` is the conversion message surface
- THEN it MUST carry `role="status"`
- AND it MUST carry `aria-live="polite"`
- AND a message written into it MUST be announced without requiring focus changes
