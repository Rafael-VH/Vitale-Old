# Delta for conversion-engine-loading

## ADDED Requirements

### Requirement: Pinned engine version

The system MUST load the Markdown conversion engine from a specific pinned version (not `@latest`).

#### Scenario: Load uses pinned version only

- GIVEN the primary engine source is available
- WHEN the engine is loaded
- THEN the system MUST request the engine at the configured pinned version
- AND the system MUST NOT request `@latest`

### Requirement: Ordered fallback

The system SHOULD attempt a secondary fallback source if the primary source fails to load.

#### Scenario: Primary fails, secondary succeeds

- GIVEN the primary source is unreachable or fails to load
- WHEN loading the engine
- THEN the system SHOULD attempt the secondary fallback source
- AND the system SHOULD succeed loading from the secondary source

#### Scenario: All sources fail

- GIVEN all configured sources fail to load
- WHEN loading the engine
- THEN the system MUST NOT leave an uncaught exception
- AND the system MUST surface a clear, non-crashing error state

### Requirement: Engine shape validation

`convert()` MUST validate the loaded engine shape before use (existing `htmlToMarkdown` function check).

#### Scenario: Loaded shape is invalid

- GIVEN a source returns a module without a callable `htmlToMarkdown` function
- WHEN validating the loaded engine
- THEN the system MUST treat that source as failed
- AND the system SHOULD proceed to the next source if available

### Requirement: Ready UI state on success

On a successful load the UI MUST reflect ready state (`#statusDot` ready, `#statusText` = "Vitale listo").

#### Scenario: Successful load sets ready UI

- GIVEN the engine loads successfully and passes shape validation
- WHEN load completes
- THEN `#statusDot` MUST indicate ready state
- AND `#statusText` MUST equal "Vitale listo"

### Requirement: Failure handling and convert() behavior

If all sources fail, the system MUST surface a clear, non-crashing error state and `convert()` MUST keep rejecting with a descriptive error (existing behavior: it throws when not loaded).

#### Scenario: All sources fail → error UI and convert rejects

- GIVEN all sources have failed to load or validate
- WHEN load completes with failure
- THEN the system MUST surface a clear error state in the UI (non-crashing)
- AND `convert()` MUST reject with a descriptive error

#### Scenario: convert() before load

- GIVEN the engine has not been successfully loaded
- WHEN `convert()` is called
- THEN `convert()` MUST reject with a descriptive error
- AND the system MUST NOT crash

### Requirement: Public contract stability

The public module contract `{load, isLoaded, convert}` MUST NOT change.

#### Scenario: Contract surface unchanged

- GIVEN the module is imported
- THEN the module MUST expose `{load, isLoaded, convert}` as the public contract
- AND no other public surface elements MUST be removed or renamed from that contract
