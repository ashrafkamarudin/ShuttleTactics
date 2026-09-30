# Recovery Zone Calibration — v1.1 Follow-up

**Scope:** Apply the proposed six recovery destinations and add deterministic engine-level positioning tests. Movement speed, recovery delay, shot trajectories, smash speed/placement, and CPU weights were not changed in this step.

The prior [movement and recovery investigation](./movement-recovery-investigation.md) records the pre-calibration geometry. Its deterministic front-left tight-drop probe produced 70.7% contact quality from the old front-left recovery point `(-0.72, 2.48)`. This follow-up evaluates the revised point `(-1.30, 1.60)`.

## Changes made

Updated the six recovery destinations in `src/engine/constants.js`:

| Position | X | Depth |
| --- | ---: | ---: |
| Front-left | -1.30 | 1.60 |
| Front-right | 1.30 | 1.60 |
| Centre-left | -0.35 | 3.20 |
| Centre-right | 0.35 | 3.20 |
| Rear-left | -1.30 | 4.80 |
| Rear-right | 1.30 | 4.80 |

Added deterministic `qualityAt()` tests for coordinate values and mirroring, front straight/cross drops, consecutive front-court exchanges, front/centre/rear movement demand against clears, deep clears, tight drops from rear recovery, and centre-side smash shading. These tests use explicit receiver, source, landing, and anticipation values; no random outcomes are involved.

## Before and after probes

The front-drop comparison uses a tight straight drop from `{x: 0, d: 3.2}` to `{x: -1.85, d: 0.62}`, with a `1.3 m` trajectory peak and front-left anticipation.

| Position when shot is struck | Before: old front recovery | After: revised recovery |
| --- | ---: | ---: |
| Nominal front-left recovery | 70.7% | 88.3% |
| Receiver already at target coordinates | 88.3% | 88.3% |

The revised point reduces distance to the selected contact sample by about 1.01 m in this setup. The contact remains late in the flight model (0.597 s of a 0.686 s flight), at 0.99 m shuttle height; the quality improvement comes from eliminating the modeled stretch. The new point therefore meets the intended straight-drop positioning outcome for this fixed scenario, though controller-level recovery timing still needs browser/rally validation.

## Scenario results

| Scenario | Deterministic result | Assessment |
| --- | --- | --- |
| A — Centre-left against straight-left smash | At source depth 4.8 m, target depth 0.6 m, power 0.8, and 2.8 m contact height, centre-left cannot reach the sampled trajectory. Closest sample: 3.04 m needed versus 2.84 m reach. | **Fails the proposed reasonable-defence expectation for this near-net target.** Centre-left is closer than centre-right, so side shading is present. The current smash does not have a body-depth target. |
| B — Centre-right against straight-left smash | Same setup; centre-right also cannot reach. Closest sample: 3.44 m needed versus 2.84 m reach. | **Fails the “disadvantage, not automatic loss” expectation for this target.** Position changes the distance, but not the outcome. |
| C — Centre-side distinction | Mirrored deterministic checks confirm each centre side is closer to its same-side straight smash. Against the tested near-net smash, both sides still miss. | Side preference is represented, but the centre positions do not yet provide a reachable smash defence in this setup. |
| D — Front-left against tight straight drop | Revised front-left position gives 88.3% quality, zero modeled stretch, and a reachable interception. The mirrored front-right test matches. | **Passes** for this tight-drop fixture. Loose straight drops also produce reachable, comfortable contact (91.8% in the probe). |
| E — Front-left against cross drop | Correct front-right position: 88.3%; partial position between corners: higher than wrong-side position; front-left with correct front-right anticipation: 53.1%; same position with front-left anticipation: 30.5%. | **Passes the relative positioning and anticipation trade-off.** A tight cross drop remains reachable in the tested aligned-anticipation case, but at stretched quality. |
| F — Front-left against full deep clear | Front, centre, and rear starts all reach the clear at 88.7% quality in this 2.137 s fixture. Their distances to the selected contact are 2.95 m, 1.81 m, and 0.38 m respectively. | **Position affects movement demand but not contact quality here.** The long flight allows enough movement that stretch saturates at zero, so this model does not make front recovery meaningfully worse for this clear. |
| F — Correct versus incorrect rear anticipation | At rear-left against the same full left clear, correct anticipation changes reaction from 0.27 s (incorrect front-left lean) to 0.09 s and adds about 0.66 m of movement budget; both still receive 88.7% quality. | Anticipation changes readiness, but its contact-quality benefit is hidden once both cases saturate at zero stretch. This matches the reported high CPU contact when it has enough time. |
| G — Rear-left against deep clear | Rear-left reaches at 88.7% quality, at 2.96 m height, in the same clear fixture. Partial and front starts also reach it in this setup. | Rear-left overhead contact **passes**. The probe does not establish that a deep clear punishes front recovery enough. |
| H — Rear-left against tight drop | Rear-left cannot reach the tight drop; front-left can. Intermediate positions have greater movement demand than front-left. Mirrored sides behave symmetrically. | **Passes** for the tested straight-drop fixture. |
| Consecutive front exchanges | After a comfortable front-left contact, remaining at that contact point cannot reach a tight cross drop to front-right; completing recovery to front-right allows 88.3% contact. A rear-left start also misses. | Confirms the position trade-off for these fixed states. It does not simulate actual recovery animation or elapsed balance time. |

The smash probe also confirms why the current v1.1 smash result needs its own next investigation: its target depth is 0.45–0.70 m, so the post-net sampling window is short. The zone update alone cannot make that target defensible from centre court. This step intentionally leaves smash speed and placement unchanged.

## Test results and limits

`npm test` passes **18/18** tests after the coordinate update. `git diff --check` passes. Tests exercise the pure interception function with explicit inputs; they do not run the controller's animation loop or a browser rally.

The tests cover at least three receiver positions for the front straight-drop, front cross-drop, smash-side, full-clear, rear-clear, and rear-drop scenarios. The consecutive exchange test compares a just-contacted position, a completed opposite-corner recovery, and an out-of-position rear state. The engine-level mirror test confirms left/right symmetry.

No movement speed, recovery-delay, shuttle-flight, or CPU scoring parameters were changed. No root cause is asserted for the 1.67 s clear rally or repeated CPU drop selection; those need a state/decision trace from actual rallies.

## Next smallest investigations

1. Add controller-level traces for actual position at strike, recovery progress, remaining recovery delay, predicted target, chosen contact sample, and contact-quality contributions. Then verify the new front coordinates during a real consecutive rally.
2. Investigate smash depth/trajectory and centre defence with the same trace. Consider target depth or trajectory-window modeling before changing global movement or speed.
3. Compare clear contact outcomes across front, centre, and rear starts under actual recovery timing. The pure probe shows ample simulated movement for a long full clear, but does not determine whether that is desirable gameplay.
4. Log CPU per-shot candidate scores and chosen outcomes before changing shot-selection weights.
