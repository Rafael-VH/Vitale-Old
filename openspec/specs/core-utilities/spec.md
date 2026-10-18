# core-utilities Specification

## Purpose

The shared helper layer (`js/core/utils.js`) used across panels: HTML escaping and the alert message
helpers. Introduced by change `harden-conversion-flow`, which found the message helpers asymmetric — one
guarded against an absent target element and its sibling threw.

## Requirements

### Requirement: Alert helper null-safety

Both alert message helpers MUST tolerate an absent target element without throwing.

#### Scenario: Writing a message to an absent target

- GIVEN an alert helper is called with an id that matches no element in the document
- WHEN the helper runs
- THEN it MUST NOT throw
- AND it MUST return without side effects

#### Scenario: Clearing an absent target

- GIVEN the clear helper is called with an id that matches no element in the document
- WHEN the helper runs
- THEN it MUST NOT throw
- AND it MUST return without side effects

#### Scenario: Helpers are symmetric

- GIVEN the same absent target id
- WHEN both the write helper and the clear helper are called
- THEN both MUST handle the absent target the same way
- AND neither MUST be the only guarded one

### Requirement: Existing message behaviour preserved

For a present target element, the alert helpers MUST keep their current behaviour.

#### Scenario: Message writes and auto-clears

- GIVEN a target element exists
- WHEN a message is written
- THEN the element MUST show the message and its message-kind class
- AND a subsequent clear MUST remove the message content

### Requirement: HTML escaping

Any dynamic value interpolated into markup MUST be escaped through the shared escape helper.

#### Scenario: Special characters are neutralised

- GIVEN a string containing markup-significant characters
- WHEN it is passed through the escape helper
- THEN the markup-significant characters MUST be neutralised
- AND the result MUST NOT introduce executable markup when interpolated into `innerHTML`
