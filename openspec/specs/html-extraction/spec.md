# html-extraction Specification

## Purpose

The per-site extractor cascade: how a document is reduced to its main content, in what order the extraction
strategies are tried, and the threshold that decides when a strategy yields to the next. Introduced by
change `harden-conversion-flow`, which found a registered extractor step that can never execute while its
source comment claims it does.

## Requirements

### Requirement: Cascade order

Main-content extraction MUST attempt strategies in the order: site selectors, then a site-specific custom
step, then the generic fallback.

#### Scenario: Selector step succeeds

- GIVEN a document whose configured selector matches an element with acceptable content
- WHEN extraction runs
- THEN the content MUST come from that selector
- AND later strategies MUST NOT be consulted

#### Scenario: Generic fallback is last

- GIVEN no site-specific strategy yields acceptable content
- WHEN extraction runs
- THEN the generic extraction MUST be attempted
- AND it MUST NOT be attempted before the site-specific strategies

### Requirement: Content threshold gate

A strategy's result MUST be accepted only when it meets the configured content threshold; a result below
the threshold MUST cause extraction to continue with the next strategy.

#### Scenario: Selector result below the threshold yields to the next strategy

- GIVEN a configured selector matches but yields content shorter than the content threshold
- WHEN extraction runs
- THEN that result MUST be rejected
- AND the next configured strategy MUST run

### Requirement: No unreachable strategy

A strategy that an extractor declares MUST be reachable under its documented trigger conditions. A
declared step that can never execute because an earlier step always wins is a defect.

#### Scenario: Declared custom step is reachable

- GIVEN an extractor declares a site-specific custom step for a condition it documents
- WHEN that condition holds for a real document of that site
- THEN the custom step MUST execute
- AND it MUST NOT be shadowed by an earlier step that always succeeds first

#### Scenario: Redundant step is removed rather than left dead

- GIVEN a declared step's condition can never hold because an earlier step always satisfies the threshold
  gate
- THEN the step MUST be removed, or the cascade MUST be reordered so the step can execute
- AND the accompanying comment MUST describe the actual behaviour

### Requirement: Registry contract stability

The extractor registry's public surface MUST NOT change.

#### Scenario: Registry surface unchanged

- GIVEN the registry module is loaded
- THEN it MUST expose the same public operations as before this change (register, lookup, membership,
  listing, domain enumeration, and label resolution)
- AND no existing public operation MUST be renamed or removed
