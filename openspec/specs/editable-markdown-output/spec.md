# editable-markdown-output Specification

## Purpose

The Markdown result surface (`#mdOutput`) and the guarantee that every consumer of that text — the download
path, Copiar, and the character counter — observes the text the user actually sees. Introduced by change
`editable-markdown-output`, which found the result was display-only: a `<div>` a user could not act on, so a
draft that needed one correction had to be downloaded and re-edited in an external editor.

The surface is a native plain-text control, not a rich-text one. Markdown is raw text, and any
reinterpretation of it (rich-text paste, a `<div>` or `<br>` per line break, collapsed blank lines) is
corruption. The surface's text therefore lives in exactly one place, and the underlying counter helper
already reads that place, so no helper change is required.

## Requirements

### Requirement: Editable result surface

The converted Markdown MUST be presented in an editable plain-text control.

#### Scenario: Result is editable after a conversion

- GIVEN a file has been converted successfully
- WHEN the user interacts with the result surface
- THEN the surface MUST accept text input
- AND its text MUST be the converted Markdown

#### Scenario: Text is preserved verbatim

- GIVEN Markdown containing blank lines and indentation
- WHEN it is written to the result surface
- THEN the surface text MUST equal the written text character for character
- AND the surface MUST NOT reinterpret it as markup

#### Scenario: Empty result shows the hint

- GIVEN no conversion has produced content yet
- THEN the result surface MUST show its empty-state hint
- AND the hint MUST be supplied by a mechanism that renders on the control

### Requirement: Accessible name for the result control

The result control MUST be associated with its visible label.

#### Scenario: Label points at the control

- GIVEN a visible label describes the Markdown result
- THEN it MUST be programmatically associated with the result control
- AND activating the label MUST target that control

### Requirement: Save uses the current text

The downloaded `.md` MUST contain the text currently in the result surface, including user edits.

#### Scenario: Editing before download changes the saved file

- GIVEN a conversion produced Markdown and the user edited the result
- WHEN the download is confirmed
- THEN the saved content MUST be the edited text
- AND it MUST NOT be the original conversion

#### Scenario: Downloading without editing saves the conversion unchanged

- GIVEN a conversion produced Markdown and the user made no edit
- WHEN the download is confirmed
- THEN the saved content MUST equal the converted Markdown

### Requirement: Copy uses the current text

Copiar MUST place the text currently in the result surface on the clipboard, including user edits.

#### Scenario: Editing before copying copies the edit

- GIVEN a conversion produced Markdown and the user edited the result
- WHEN the user copies the result
- THEN the copied content MUST be the edited text
- AND it MUST NOT be the original conversion

### Requirement: Empty and error guards preserved

Saving or copying MUST still refuse an empty result and a result that begins with the failure marker (`❌`).

#### Scenario: Empty result is refused

- GIVEN the result surface is empty
- WHEN the user attempts to download
- THEN the user MUST be warned
- AND no file MUST be produced

#### Scenario: Errored result is refused

- GIVEN the result surface holds a conversion error message
- WHEN the user attempts to download
- THEN the user MUST be warned
- AND no file MUST be produced

### Requirement: Counter reflects the current text

The character counter for the result MUST reflect the text currently in the surface, including manual edits.

#### Scenario: Typing updates the counter

- GIVEN the result surface holds text and its counter shows that length
- WHEN the user types or deletes characters
- THEN the counter MUST update to the new length

#### Scenario: Converting updates the counter

- GIVEN a conversion writes new Markdown to the result surface
- WHEN the write completes
- THEN the counter MUST show the new length
