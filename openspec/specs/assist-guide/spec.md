# assist-guide Specification

## Purpose

The URL assist modal (`js/assist-panel.js`) and the platform guidance it shares with the upload card: a
single definition of the "how to get the HTML" instructions, and inline (non-blocking) feedback. Introduced
by change `harden-conversion-flow`, which found the platform instructions duplicated in two modules with
different wording, and four native blocking `alert()` calls used for user feedback while the panel already
had an inline message surface.

## Requirements

### Requirement: Single definition of platform instructions

The step-by-step instructions for obtaining a page's HTML MUST originate from exactly one definition, and
both the assist modal and the upload card MUST render that same definition. The instructions MUST name only
controls that exist on the entry surface after the layout change: the upload affordance, the entry field, and
the "Convertir" and "Descargar" actions.

#### Scenario: Editing the copy updates both surfaces

- GIVEN the platform instructions are defined in one place
- WHEN that definition changes
- THEN both the assist modal and the upload card MUST render the updated instructions
- AND no second, independently-worded copy MUST exist

#### Scenario: Instructions match the selected platform

- GIVEN a platform is resolved from the user agent
- WHEN the instructions are rendered
- THEN the rendered steps MUST be the ones defined for that platform

#### Scenario: Instructions name controls that exist

- GIVEN the entry surface renders with the upload affordance inside the entry column
- WHEN the platform instructions are rendered
- THEN every control the steps name MUST exist on the page
- AND no step MUST name a removed control

### Requirement: Upload-card copy from one source

The upload-card placeholder copy MUST be defined once and reused, not duplicated as literal strings across
modules. The copy MUST describe the affordance that is actually rendered: drag-and-drop wording where the
drop target exists, and tap-to-choose wording where the input is pointer-driven.

#### Scenario: Upload copy has a single origin

- GIVEN the upload card renders its placeholder text
- THEN that text MUST come from a single shared definition
- AND no literal duplicate of that string MUST exist in another module

#### Scenario: Copy matches the rendered affordance

- GIVEN a platform where dragging a file is available
- WHEN the upload card renders
- THEN its copy MUST describe dropping or choosing a file
- AND GIVEN a platform where the input is pointer-driven
- THEN its copy MUST describe selecting a file

### Requirement: Non-blocking inline feedback

The assist panel MUST NOT use native blocking dialogs (`alert()`, `confirm()`) to report feedback. All user
feedback it produces MUST render inline within the panel and MUST NOT interrupt the page.

#### Scenario: Invalid URL scheme is reported inline

- GIVEN the user submits a URL whose scheme is rejected by the scheme guard
- WHEN the guard rejects it
- THEN a visible message MUST render inline within the assist panel
- AND no native blocking dialog MUST be shown
- AND the panel MUST remain usable (the user can correct the URL and retry)

#### Scenario: Empty or invalid input is reported inline

- GIVEN the user submits an empty or malformed URL
- WHEN the panel validates it
- THEN a visible inline message MUST render within the panel
- AND no native blocking dialog MUST be shown
