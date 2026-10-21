# entry-layout Specification

## Purpose

The spatial arrangement of the conversion page: where the upload affordance lives relative to the entry field
and the result field, how those surfaces behave as the viewport narrows, and which controls the entry surface
exposes. Introduced by change `two-column-layout`, which found the page stacked three full-width bands
vertically — the upload card, the `.grid-2` field pair, and the action row — so the action buttons were pushed
below the fold on laptops and on tablets held horizontally, the screens with vertical room to spare. The
underlying `.grid-2` already split the two text fields into columns, but the upload card sat above it at full
width and the pair collapsed to a single column below a breakpoint chosen without regard to orientation.

## Requirements

### Requirement: The entry and result surfaces share one row

On a viewport at or above the wide-layout breakpoint, the entry surface and the result surface MUST render
side by side in a single row, and the upload affordance MUST occupy the entry side of that row rather than a
separate full-width band above it.

#### Scenario: Wide viewport places the two surfaces side by side

- GIVEN a viewport at or above the wide-layout breakpoint
- WHEN the page renders
- THEN the entry surface MUST occupy one column of the row
- AND the result surface MUST occupy the other column of the row
- AND the upload affordance MUST render within the entry column

#### Scenario: The action buttons are not pushed below the fold

- GIVEN a viewport at or above the wide-layout breakpoint
- WHEN the page renders with the upload affordance present in the entry column
- THEN the primary action buttons MUST remain reachable without vertical scrolling of the page

### Requirement: Narrow viewports stack without losing the entry path

On a viewport below the wide-layout breakpoint, the two surfaces MUST stack vertically, and the upload
affordance MUST remain the primary way to bring a file in.

#### Scenario: Narrow viewport stacks the surfaces

- GIVEN a viewport below the wide-layout breakpoint
- WHEN the page renders
- THEN the entry surface MUST render above the result surface
- AND each surface MUST use the full available width

#### Scenario: The upload affordance stays operable without drag-and-drop

- GIVEN a pointer that cannot drag a file, or a narrow viewport
- WHEN the user acts on the upload affordance
- THEN the file chooser MUST open
- AND the affordance MUST remain visible and operable at the narrow width

### Requirement: The entry surface offers exactly the entry controls that work

The entry surface MUST expose the file-input affordance and a control to clear the entry. It MUST NOT expose a
dedicated paste control, because a control that only works when the browser grants clipboard-read access
misrepresents the capability it advertises.

#### Scenario: The entry surface exposes no paste control

- GIVEN the entry surface is rendered
- THEN no dedicated paste button MUST be present among its controls
- AND no script reference to a paste control MUST remain
- AND pasting into the entry field MUST still be possible through the platform's native paste

#### Scenario: Clearing the entry resets the surface

- GIVEN the entry field holds text or a loaded file
- WHEN the user activates the clear control
- THEN the entry field MUST empty
- AND the result surface and its feedback MUST reset

### Requirement: The action labels name the action

The primary and secondary action buttons MUST carry the labels "Convertir" and "Descargar", naming the action
rather than restating the input and output formats.

#### Scenario: The action buttons carry the short labels

- GIVEN the action row is rendered
- THEN the conversion button label MUST be "Convertir"
- AND the download button label MUST be "Descargar"

### Requirement: Moving the upload affordance preserves its behaviour

Relocating the upload affordance into the entry column MUST NOT change how it loads a file: the drop target,
the loaded state, and the file-name display MUST keep working exactly as before the move.

#### Scenario: Drag-and-drop still loads a file in the entry column

- GIVEN a wide viewport with the upload affordance inside the entry column
- WHEN a file is dragged over the affordance and dropped
- THEN the file MUST load into the entry field
- AND the loaded state MUST be shown

#### Scenario: The loaded state survives the move

- GIVEN a file has been loaded through the affordance
- WHEN the affordance renders its loaded state
- THEN it MUST show the loaded styling and the file name
- AND the entry field MUST hold the file's text
