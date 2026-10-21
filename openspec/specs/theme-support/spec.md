# theme-support Specification

## Purpose

The colour scheme the app renders. Introduced by change `light-theme`, which found that the app is dark-only
by accident rather than by design: every surface, text, border, glow and shadow value in the stylesheet is a
single fixed palette tuned against a near-black page, and no mechanism — `prefers-color-scheme`,
`color-scheme`, `data-theme`, a stored preference — exists anywhere in the tree. A user whose operating
system prefers a light scheme gets the dark UI anyway, and parts of that dark UI are not merely unusual on a
light page but unreadable: the brand title and the alert messages were authored as light-on-dark and are
never re-evaluated.

The capability therefore provides a complete light scheme alongside the original dark one, and gives the user
the final say over which of them is rendered. Three modes exist: `auto` follows the operating system, and is
the default; `light` and `dark` pin the scheme regardless of the operating system. The chosen mode is
remembered across reloads.

Because colour is confined to one place — no JavaScript file and no markup file contains a colour literal —
the mechanism is cascade-ordered: a `@media (prefers-color-scheme: light)` block carries the automatic path,
and `[data-theme]` blocks carry the pinned paths over the same token layer. The dark scheme keeps its exact
appearance; that is a requirement, not a side effect.

## Requirements

### Requirement: The scheme is selectable among auto, light and dark

The app MUST offer exactly three scheme modes: `auto`, `light` and `dark`. `auto` MUST follow the operating
system's preference and MUST be the default when no choice has been stored. `light` and `dark` MUST override
the operating system's preference. The chosen mode MUST persist across reloads and MUST be applied before the
first paint, so that a pinned mode never flashes the other scheme.

#### Scenario: Automatic follows a dark operating system

- GIVEN no stored mode, or the stored mode `auto`
- WHEN the operating system prefers a dark colour scheme
- THEN the dark palette MUST be applied
- AND no light-scheme override MUST apply

#### Scenario: Automatic follows a light operating system

- GIVEN no stored mode, or the stored mode `auto`
- WHEN the operating system prefers a light colour scheme
- THEN the light palette MUST be applied
- AND no manual action MUST be required to obtain it

#### Scenario: Explicit light overrides a dark operating system

- GIVEN the stored mode `light`
- WHEN the operating system prefers a dark colour scheme
- THEN the light palette MUST be applied
- AND the dark palette MUST NOT be applied

#### Scenario: Explicit dark overrides a light operating system

- GIVEN the stored mode `dark`
- WHEN the operating system prefers a light colour scheme
- THEN the dark palette MUST be applied
- AND no light-scheme override MUST apply

#### Scenario: Returning to automatic restores operating-system following

- GIVEN a stored mode of `light` or `dark`
- WHEN the mode is cycled back to `auto`
- THEN the rendered scheme MUST match the operating system again

#### Scenario: The mode survives a reload

- GIVEN a stored mode of `light` or `dark`
- WHEN the app is reloaded
- THEN the stored mode MUST still be in effect
- AND the other scheme MUST NOT be rendered at any point before the first paint

#### Scenario: An unusable stored value falls back to automatic

- GIVEN a stored value that is not one of the three modes, or a storage medium that cannot be read
- WHEN the app renders
- THEN the `auto` mode MUST be applied
- AND the app MUST still render correctly

#### Scenario: The control is reachable and labelled

- GIVEN the app is open
- WHEN the scheme control is reached with the keyboard
- THEN it MUST be focusable and operable without a pointer
- AND it MUST expose an accessible name that states the current mode
- AND its visual state MUST NOT be conveyed by colour alone

### Requirement: The dark theme is unchanged

The dark scheme MUST render the same computed colours it had before the light scheme existed. This change
adds a scheme and a selector for it; it does not revise the dark palette.

#### Scenario: Dark computed colours are preserved under automatic

- GIVEN the `auto` mode and an operating system that prefers a dark scheme
- WHEN a themed element's colour is measured from the rendered page
- THEN its computed value MUST equal the value it had before this capability was introduced
- AND this MUST hold for surfaces, text, borders, glows, shadows, gradients and focus rings alike

#### Scenario: Dark computed colours are preserved under explicit dark

- GIVEN the `dark` mode, regardless of the operating system's preference
- WHEN a themed element's colour is measured from the rendered page
- THEN its computed value MUST equal the value it had before this capability was introduced

### Requirement: The light theme is complete

Every colour token the app declares MUST have a light value, and that value MUST be identical whether light
is reached automatically or explicitly. A theme that is only partly re-declared lets a dark value leak into
the light scheme silently, which is the failure mode this capability exists to prevent.

#### Scenario: No token leaks a dark value into the light scheme

- GIVEN the light scheme is active
- WHEN a colour token declared in the stylesheet's root is read
- THEN it MUST resolve to the light value for that token

#### Scenario: Both paths into light agree

- GIVEN the automatic light block and the explicit light block
- WHEN their declarations are compared
- THEN they MUST declare the same tokens with the same values
- AND they MUST declare the same rule overrides

#### Scenario: The light block wins by cascade order

- GIVEN the root token declarations and the light blocks
- WHEN their order in the stylesheet is examined
- THEN each light block MUST appear after the root declarations
- AND it MUST re-declare tokens at equal or greater specificity so its values apply

### Requirement: Text remains legible in both schemes

Text MUST remain legible against the surface it is actually rendered on, in both schemes, at a contrast
ratio of at least 4.5:1 for normal text and 3:1 for the non-text UI components that carry meaning, such as
input borders and focus rings.

#### Scenario: Secondary and muted text on their worst surface

- GIVEN the light scheme is active
- WHEN secondary text and muted text are measured on every surface they are rendered on
- THEN each MUST meet the contrast ratio against that surface
- AND the worst-case surface MUST be the one the value is chosen for, not the most favourable one

#### Scenario: The brand title is legible in the light scheme

- GIVEN the light scheme is active
- WHEN the brand title is rendered
- THEN its foreground MUST meet the contrast ratio against the page behind it
- AND it MUST NOT be composed of a light value on a light surface

#### Scenario: Alert messages are legible in the light scheme

- GIVEN the light scheme is active
- WHEN a warning, error, success or informational alert is rendered
- THEN its message MUST meet the contrast ratio against the alert's own background
- AND its background and border MUST remain distinguishable from the surrounding panel

#### Scenario: The focus indicator is visible in the light scheme

- GIVEN the light scheme is active
- WHEN a text field receives focus
- THEN the focus indicator MUST be distinguishable from the field and from the page

#### Scenario: The scheme control is legible in both schemes

- GIVEN either scheme is active
- WHEN the scheme control is rendered
- THEN its icon MUST meet the non-text contrast ratio against the surface it sits on
- AND its focus indicator MUST be distinguishable in both schemes

### Requirement: An accent hue serves text and fill as separate roles

An accent hue is used both as a gradient fill, where it is the background of a component that carries its own
dark ink, and as a foreground on a surface. These two roles need opposite light values, so they MUST be
carried by separate tokens: the fill keeps the vivid value, the foreground takes the scheme's legible value.

#### Scenario: Accent text is legible while accent fills stay vivid

- GIVEN the light scheme is active
- WHEN text rendered in an accent hue is measured against its surface
- THEN it MUST meet the contrast ratio
- AND a gradient filled with the same hue MUST keep that hue's vivid appearance
- AND the ink drawn on top of that gradient MUST remain legible on it

#### Scenario: The role split is inert in the dark scheme

- GIVEN the dark scheme is active
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
