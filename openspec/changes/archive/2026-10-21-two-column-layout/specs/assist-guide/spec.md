# assist-guide — Delta for `two-column-layout`

## MODIFIED Requirements

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

## MODIFIED Requirements

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
