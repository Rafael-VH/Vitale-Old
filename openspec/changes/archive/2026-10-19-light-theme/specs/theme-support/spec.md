# theme-support Specification

## Purpose

The colour scheme the app renders. Introduced by change `light-theme`, which found that the app is dark-only
by accident rather than by design: every surface, text, border, glow and shadow value in the stylesheet is a
single fixed palette tuned against a near-black page, and no mechanism — `prefers-color-scheme`,
`color-scheme`, `data-theme`, a stored preference — exists anywhere in the tree. A user whose operating
system prefers a light scheme gets the dark UI anyway, and parts of that dark UI are not merely unusual on a
light page but unreadable: the brand title and the alert messages were authored as light-on-dark and are
never re-evaluated.

The capability therefore makes the operating system the single source of truth for the scheme. There is no
toggle, no cycle and no stored preference: the UI matches the OS, always, and that is the whole contract.

Because colour is confined to one place — no JavaScript file and no markup file contains a colour literal —
the mechanism is one cascade-ordered `@media (prefers-color-scheme: light)` block over the existing token
layer. The dark scheme keeps its exact appearance; that is a requirement, not a side effect.

## Requirements

### Requirement: The scheme follows the operating system

The rendered colour scheme MUST match the operating system's preference, with no user action and no stored
preference.

#### Scenario: The operating system prefers dark

- GIVEN the operating system prefers a dark colour scheme
- WHEN the app renders
- THEN the dark palette MUST be applied
- AND no light-scheme override MUST apply

#### Scenario: The operating system prefers light

- GIVEN the operating system prefers a light colour scheme
- WHEN the app renders
- THEN the light palette MUST be applied
- AND no manual action MUST be required to obtain it

#### Scenario: No user-controlled scheme

- GIVEN the app is open
- WHEN its interface is inspected for a scheme control
- THEN no toggle, cycle or selector for the colour scheme MUST exist
- AND the scheme MUST NOT depend on anything the app stores

### Requirement: The dark theme is unchanged

The dark scheme MUST render the same computed colours it had before the light scheme existed. This change
adds a scheme; it does not revise the dark palette.

#### Scenario: Dark computed colours are preserved

- GIVEN the operating system prefers a dark scheme
- WHEN a themed element's colour is measured from the rendered page
- THEN its computed value MUST equal the value it had before this capability was introduced
- AND this MUST hold for surfaces, text, borders, glows, shadows, gradients and focus rings alike

### Requirement: The light theme is complete

Every colour token the app declares MUST have a light value. A theme that is only partly re-declared lets a
dark value leak into the light scheme silently, which is the failure mode this capability exists to prevent.

#### Scenario: No token leaks a dark value into the light scheme

- GIVEN the operating system prefers a light scheme
- WHEN a colour token declared in the stylesheet's root is read
- THEN it MUST resolve to the light value for that token

#### Scenario: The light block wins by cascade order

- GIVEN the root token declarations and a `prefers-color-scheme: light` block
- WHEN their order in the stylesheet is examined
- THEN the light block MUST appear after the root declarations
- AND it MUST re-declare tokens at equal or greater specificity so its values apply

### Requirement: Text remains legible in both schemes

Text MUST remain legible against the surface it is actually rendered on, in both schemes, at a contrast
ratio of at least 4.5:1 for normal text and 3:1 for the non-text UI components that carry meaning, such as
input borders and focus rings.

#### Scenario: Secondary and muted text on their worst surface

- GIVEN the operating system prefers a light scheme
- WHEN secondary text and muted text are measured on every surface they are rendered on
- THEN each MUST meet the contrast ratio against that surface
- AND the worst-case surface MUST be the one the value is chosen for, not the most favourable one

#### Scenario: The brand title is legible in the light scheme

- GIVEN the operating system prefers a light scheme
- WHEN the brand title is rendered
- THEN its foreground MUST meet the contrast ratio against the page behind it
- AND it MUST NOT be composed of a light value on a light surface

#### Scenario: Alert messages are legible in the light scheme

- GIVEN the operating system prefers a light scheme
- WHEN a warning, error, success or informational alert is rendered
- THEN its message MUST meet the contrast ratio against the alert's own background
- AND its background and border MUST remain distinguishable from the surrounding panel

#### Scenario: The focus indicator is visible in the light scheme

- GIVEN the operating system prefers a light scheme
- WHEN a text field receives focus
- THEN the focus indicator MUST be distinguishable from the field and from the page

### Requirement: An accent hue serves text and fill as separate roles

An accent hue is used both as a gradient fill, where it is the background of a component that carries its own
dark ink, and as a foreground on a surface. These two roles need opposite light values, so they MUST be
carried by separate tokens: the fill keeps the vivid value, the foreground takes the scheme's legible value.

#### Scenario: Accent text is legible while accent fills stay vivid

- GIVEN the operating system prefers a light scheme
- WHEN text rendered in an accent hue is measured against its surface
- THEN it MUST meet the contrast ratio
- AND a gradient filled with the same hue MUST keep that hue's vivid appearance
- AND the ink drawn on top of that gradient MUST remain legible on it

#### Scenario: The role split is inert in the dark scheme

- GIVEN the operating system prefers a dark scheme
- WHEN a foreground token and its fill token of the same hue are measured
- THEN they MUST resolve to the same value

### Requirement: The token layer stays coherent

The token layer is what makes a second scheme possible at all, so it MUST stay self-consistent: every token
used is declared, every declared token is used, and any colour that must change with the scheme lives in a
token rather than being repeated as a literal.

#### Scenario: No undeclared token

- GIVEN the stylesheet
- WHEN any `var()` reference is examined
- THEN the token it names MUST be declared

#### Scenario: No unused token

- GIVEN the stylesheet
- WHEN a declared colour token is examined
- THEN it MUST be referenced somewhere in the stylesheet

#### Scenario: Scheme-dependent colours are tokens

- GIVEN a colour that must differ between schemes
- WHEN the scheme changes
- THEN its computed value MUST change

#### Scenario: Scheme-invariant colours may be literals

- GIVEN a colour composed against a brand fill or an accent glow rather than against a page surface
- WHEN the scheme changes
- THEN its computed value MUST NOT change
