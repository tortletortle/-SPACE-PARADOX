# SPACE PARADOX / 空间悖论

A browser-based spatial-topology puzzle game and world-editing laboratory. The project is a static HTML/CSS/JavaScript application; no build step or external runtime package is required.

## Run

1. Clone or download this repository.
2. Open `index.html` with a current Chrome or Edge browser.
3. Prefer a browser with WebGL enabled. A 2.5D compatibility renderer is available when WebGL cannot initialize.
4. Procedural audio is opt-in; use the in-game sound control to enable it after a user gesture.

## Controls

- `W/A/S/D`: move
- `Q/E`: turn
- `Space`: jump
- `F`: interact with mechanisms, seals, cores and the star-gate rotor
- `G/R`: pick up / release and throw matter objects
- `H/J/K`: pocket-container grab / enter / exit
- Drag the scene to look around; touch controls are available on narrow screens.

## Current architecture

- `index.html`: core game loop, room graph, portal transforms, movement, vertical physics, base chapters and workshop.
- `visuals.js`, `lighting.js`, `portals.js`: architectural meshes, lighting and bounded recursive portal views.
- `palace.js`, `rotor.js`, `bridge.js`, `islands.js`, `abyss.js`: gravity palace, topology rotor, foldable causeway, star archipelago and void recovery chapters.
- `atmosphere.js`: opt-in procedural audio, transition feedback and chapter resume.
- `workshop.js`, `editor.js`, `groups.js`: world editing, direct manipulation and atomic group operations.
- `templates.js`, `optimizer.js`, `evolution.js`: parametric architecture, playability-constrained search and seeded evolutionary search.
- `puzzles.js`, `topology.js`: seeded paradox puzzle generation, phase-aware solving, topology mutations, structural signatures and shortest-path counting.
- `robustness.js`: V2.8 deterministic multi-seed validation and relative-complexity seed selection.

## V2.8 — Seed Robustness Lab

The new panel is inserted below the topology-variant controls in the puzzle generator.

For a selected difficulty, it evaluates 16, 32 or 64 reproducible seeds. The seed sequence is:

`seed[i] = (base + i × 7919) mod 2^32`

Each sample checks:

1. Generation result and required fields.
2. Unique door endpoints and valid room/door references.
3. Route endpoints, phase values and portal transform parameters.
4. Platform count, finite coordinates and positive dimensions.
5. Phase-aware graph solvability and agreement between the generator's minimum-action value and the independent topology solver.
6. Stored jump witnesses and a fresh local jump-witness recheck for each adjacent platform pair.
7. Canonical topology signature for structural-diversity reporting.

The report includes generation/pass rates, Wilson 95% confidence intervals, failure-category counts, topology diversity, P50/P95 generation time, and a JSON export.

The recommended seed is selected by a batch-relative complexity proxy:

- 55%: percentile rank of abstract minimum actions.
- 25%: percentile rank of the longest local jump witness.
- 20%: inverse percentile rank of the number of equally-short abstract solutions.

The user can target P20, P50 or P80 and apply the recommended seed to the existing puzzle generator.

### Interpretation limits

- The complexity score is relative to the current batch; it is not calibrated against human playtests.
- A local jump witness certifies only a restricted adjacent-platform movement policy. It does not prove that arbitrary players can complete the entire level.
- A 16–64 seed sample can reveal failures and recurring failure modes, but cannot prove that all possible seeds are valid. Repeat with an independent seed range before treating a repeated failure as systematic.
- The in-app batch run evaluates the actual browser-loaded generator. A mocked UI smoke test is not a substitute for that real seed sweep.

## Validation performed for V2.8

- JavaScript syntax check: passed.
- Chromium UI contract smoke test with deterministic mock APIs: 32-sample run, target switching, recommendation application, cancellation, JSON export and 390px mobile layout all passed; no page errors or horizontal overflow.
- This smoke test validates the panel wiring and controls only. It does **not** report real puzzle-generator success rates. Run the in-app benchmark to collect those measurements.
