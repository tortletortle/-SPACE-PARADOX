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
- `puzzles.js`: seeded paradox puzzle generation, phase-aware mission search and local jump-witness generation.
- `topology.js`: phase-aware shortest-path counting, seeded topology mutations and V2.9 semantic topology fingerprints.
- `robustness.js`: multi-seed validation and relative-complexity seed selection.

## V2.9 — Semantic Topology and Robustness

### Semantic topology fingerprint

The previous canonical signature only encoded the undirected room-adjacency matrix. It therefore collapsed many puzzles that shared the same abstract chain-and-shortcut graph even when their actual portal mechanics differed.

The V2.9 fingerprint now preserves:

1. Room roles: start, return room, core room and beacon.
2. Canonical room relabeling for interchangeable intermediate rooms.
3. Exact portal door sides at both ends.
4. Reciprocal scale transform semantics (reversing an edge negates its scale exponent).
5. Mirror and gravity transforms.
6. Route order and the beacon's required phase.

It deliberately does not include room names or raw platform coordinates: those are labels and geometry, not room-graph topology. The fingerprint is a structural comparison key, not a claim that two levels have identical player experience.

### Browser regression

The GitHub Actions workflow `.github/workflows/topology-regression.yml` launches Chromium and loads the real game, not a mocked puzzle API. It checks:

- 96 deterministic seeds (32 per difficulty tier).
- Deterministic generation, graph solvability and minimum-action agreement.
- Unique portal endpoints, valid room references and valid phase/transform values.
- Platform geometry and independent local jump-witness rechecks.
- Signature invariance under intermediate-room renaming and reciprocal edge reversal.
- Signature sensitivity to door-side, transform, route-order and beacon-phase changes.
- 54 bounded mutation attempts (18 each for `any`, `unique`, and `multiple` shortest-solution modes).
- The real in-page benchmark, recommendation application, JSON export and mobile panel overflow.

### Observed baseline and V2.9 result

The same 96 seed inputs were measured with the legacy adjacency-only signature and the V2.9 semantic signature:

| Difficulty | Legacy signatures | V2.9 semantic signatures |
|---|---:|---:|
| Intro | 3 / 32 | 24 / 32 |
| Advanced | 4 / 32 | 30 / 32 |
| Challenge | 5 / 32 | 32 / 32 |

Across the sampled seeds:

- 96/96 generated puzzles passed all generation, graph, geometry and local jump-witness checks.
- All six signature invariants passed for all 96 seeds (rename/reverse invariance and door/transform/phase/route sensitivity).
- 54/54 bounded mutation searches found a candidate: 18/18 in each shortest-solution mode.
- The mutation candidates contained 36 distinct V2.9 semantic signatures in this sample.
- The real UI benchmark completed 16/16 samples, selected a recommendation, exported a 16-record JSON report and applied the recommended seed.
- The panel itself had no horizontal overflow at a 390px viewport; no browser page errors were observed.

These are measured results for the fixed seed ranges in the CI run, not proof over all 32-bit seeds or all player behavior. Local jump witnesses certify a restricted adjacent-platform policy, not arbitrary human play. The relative-complexity score remains an uncalibrated proxy until supported by human playtests.

## V2.8 — Robustness Lab

The in-game panel supports 16, 32 or 64 reproducible seeds, Wilson 95% confidence intervals, failure-category counts, generation-time P50/P95, complexity distribution and JSON export. Its target complexity options are batch-relative P20, P50 and P80, not human-calibrated difficulty labels.

## Validation scope

A successful automated seed sweep is a strong regression signal for the tested generator paths. It does not replace full playtesting of each chapter, collision and portal traversal checks in interactive play, accessibility review, or usability tests with players.
