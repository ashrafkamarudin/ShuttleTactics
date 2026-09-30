# Shuttle Tactics: Movement, Recovery, and Shuttle Physics Investigation

**Status:** Investigation report; no gameplay or source changes made for this report.  
**Scope:** Current working tree, including the uncommitted v1.1 smash implementation.  
**Existing checks:** `npm test` passes 8/8 tests. The existing tests do not cover the movement, recovery, or CPU scenarios in this report.

**Follow-up:** The recovery destinations have since been updated. See [Recovery Zone Calibration](./recovery-zone-calibration.md) for the new coordinates and after-change deterministic results. The findings below describe the pre-calibration coordinates.

## Executive summary

The evidence does not support globally increasing player speed or globally slowing shuttles. It does identify two concrete modeling concerns:

1. The selectable front-court recovery positions do not line up with the engine's tight drop targets. A “front-left” recovery is not a player already waiting at the engine's “front-left” drop contact point. In a deterministic tight straight-drop probe, that named recovery and matching anticipation produced 70.7% quality, while starting at the target coordinates produced 88.3%. This is consistent with the reported low quality, though it does not reproduce the exact 55% rally without its actual state.
2. The v1.1 smash aims extremely close to the net (`d = 0.45–0.70`) and uses 0.32–0.80 s flight times. The interception routine does sample the trajectory, but only after its modeled net crossing. For rear-court smashes aimed just past the net, that leaves only a small fraction of the flight available for defensive samples. This makes the current smash placement and trajectory a strong suspect for the reported unreachable returns.

The clear and CPU-selection reports remain unconfirmed. Existing code can produce full-depth clears, and it can also produce high interception quality when a receiver has enough time and little modeled stretch. The supplied log summaries omit the starting positions, actual target, and chosen contact sample needed to distinguish a legitimate interception from a modeling error.

## Confirmed code behavior

### Footwork and contact quality

[`qualityAt()`](../src/engine/interception.js#L14) samples 94 points along the simulated shot, filters points before the net buffer and outside the 0.32–3.05 m contact-height range, and accepts a point when available movement plus racket extension reaches it. Available movement is a single radial distance: `max(0, elapsed - reaction) × 3.65 m/s`. There is no acceleration, turn penalty, or court-boundary check in this calculation.

Racket reach is 0.65 m base reach, plus a 0.85 m front lunge, 0.25 m side reach, or 0.15 m rear reach according to the candidate point's direction from the receiver. These values are added together when both front and side conditions apply ([`racketReach()`](../src/engine/shuttle.js#L58)).

The selected contact is the first sample with at least 0.42 m reach margin; if none meets that margin, the fourth reachable sample is selected. Quality is calculated in [`qualityAt()`](../src/engine/interception.js#L59):

```text
0.86 + 0.18 × remaining-flight fraction
     − 0.46 × stretch
     − 0.13 when contact height is below 0.65 m
```

where `stretch = clamp((distance − movement budget) / racket extension, 0, 1)`. This means a receiver can be technically reachable but still receive a substantial stretch penalty. Conversely, an un-stretched contact has a high baseline quality even when it occurs late in the flight. These are confirmed properties of the formula; whether either is incorrectly calibrated requires playtest cases.

Anticipation changes reaction delay from a 0.22 s neutral baseline to a 0.09–0.39 s range. It affects available movement, but it does not change the predicted landing point or directly add a quality bonus ([`leanDelay()`](../src/engine/shuttle.js#L37)).

### Front-court recovery versus drop placement

The front recovery zones are at `x = ±0.72, d = 2.48` ([`ZONES`](../src/engine/constants.js#L46)). Drop targets are at `x = ±1.85`; a high-quality drop lands at `d = 0.62`, with weaker drops landing deeper ([`shotTarget()`](../src/engine/shots.js#L15), [`DROP`](../src/engine/shuttle.js#L7)). The named recovery and target therefore differ by as much as 1.13 m laterally and 1.86 m front-to-back for a tight drop.

Deterministic probes of the current `qualityAt()` function, from `{x: 0, d: 3.2}`, produced:

| Scenario | Result |
| --- | ---: |
| Tight straight drop; receiver at front-left zone `(-0.72, 2.48)`; front-left anticipation | 70.7% quality; selected contact at 0.597 s of 0.686 s, height 0.99 m, stretch 0.382 |
| Same shot; receiver already at target `(-1.85, 0.62)` | 88.3% quality; stretch 0 |
| Tight cross drop; receiver at front-left zone; front-right anticipation | 53.2% quality; stretch 0.749 |
| Same cross drop with front-left anticipation | 30.5% quality; stretch 0.932 |

This confirms that the chosen zone is not equivalent to waiting at the target point, and that anticipation affects the result. It does **not** prove that the recovery-zone geometry alone caused the reported 55% result: the actual rally's coordinates, drop depth, current position at contact, and exact selected sample are unavailable.

### Recovery timing

Recovery movement in [`fly()`](../src/game/controller.js#L93) starts after a fixed 0.12 s plus `recoveryDelay(hitterQuality)` and then moves at 3.65 m/s. `recoveryDelay()` ranges from zero to 0.38 s and depends on the preceding contact quality ([`recoveryDelay()`](../src/engine/constants.js#L24)). The human and CPU use this same movement calculation.

There is no separately accumulated “readiness” or fatigue state. A subsequent receiver's modeled readiness comes from its actual position and anticipation delay; the preceding contact quality affects where its recovery movement got to before the next interception. The present rally logs report the recovery destination and quality in places, but do not consistently record the actual start/end positions and the delay/movement budget needed to audit that interaction.

### Smash trajectory and defense

The smash implementation currently assigns a target depth of `0.45–0.70 m` and derives speed from power at 11–20 m/s, with flight time clamped to 0.32–0.80 s ([`shotTarget()`](../src/engine/shots.js#L15), [`flightTime()`](../src/engine/shuttle.js#L15)).

`qualityAt()` does not simply test the landing point: it samples the simulated trajectory. However, it discards samples until `t >= from.d / (from.d + landing.d) + 0.025`, its modeled point on the receiver's half only spans `d = 0.12` to the target depth, and it excludes shuttle heights above 3.05 m. For a rear-court smash targeted just past the net, the net-crossing fraction is close to 1, so most samples are discarded before the shuttle reaches the defender's side. The remaining samples are concentrated near the short landing area. This is a confirmed interaction between smash target depth and the interception model, and a likely explanation for the small reported reachable distances.

The next investigation should log the actual smash source depth, target depth, net-crossing fraction, first and selected post-net samples, receiver position, reaction delay, movement budget, and racket reach. Do not change smash speed until those values show whether the issue is target placement, trajectory shape, reaction, or movement.

### Clears and CPU shot choice

Full-quality clears target `d = 5.9` and peak at 5.0 m; lower-quality clears shorten and lower the trajectory (`src/engine/shots.js`, `shotTarget()`, and `src/engine/constants.js`, `PRESSURE`). Therefore, the full-clear report cannot be evaluated from the contact-quality result alone: the actual `from`, target, and receiver start position are required.

CPU shot scoring is deterministic only after its random inputs are fixed. It estimates the human's position with ±0.21 m noise, scores expected reach and quality, subtracts fault risk, and adds random variation. It chooses the top score 53% of the time, otherwise a random option among the top three ([`aiChoose()`](../src/game/controller.js#L183)). This can explain repeated drops as a response to predicted pressure, but there is no decision trace in the logs to determine whether the drops are rational or a weighting bug.

## Root-cause assessment

| Finding | Confidence | Assessment |
| --- | --- | --- |
| Front recovery names overstate how close the player is to a tight drop's predicted contact path | **Confirmed in geometry; likely contributor** | The deterministic probe falls short of the 55% observation but shows 70.7% from the nominally aligned front recovery and 88.3% from the target coordinates. Capture the actual rally state before selecting a fix. |
| Anticipation has no effect or is ignored | **Not supported** | The calculation explicitly changes reaction delay. The deterministic cross-drop comparison shows a material difference. |
| Smash defense is effectively concentrated near the landing area | **Confirmed interaction; likely contributor** | The solver samples the trajectory, but the current smash target is so near the net that the net-crossing filter leaves little receiver-side travel/time. |
| Full clears are too short or CPU anticipation is too generous | **Unconfirmed** | Full clear target/peak are configured, but the cited rally's source/target positions and CPU start state are missing. High quality follows when movement covers the distance without modeled stretch. |
| Recovery penalties accumulate across exchanges | **No accumulated state found** | A per-shot recovery delay exists and is applied equally, but no persistent balance/fatigue counter exists. Position at the next strike still needs logging. |
| CPU is incorrectly biased toward drops | **Unconfirmed** | The scoring function has substantial reach-pressure terms and randomness; candidate scores and chosen outcomes need a trace before reweighting. |

## Recommended work, in the requested phases

### Part I — Footwork and interception

1. Add an opt-in diagnostic trace around `qualityAt()` and the rally controller. Record receiver position at the opponent's strike, recovery destination and actual recovery progress, incoming source/target/type, reaction delay and anticipation alignment, net-crossing time, selected contact point/time/height, distance, movement budget, each racket-reach component, stretch, timing contribution, quality contributions, and resulting feet position.
2. Add deterministic engine tests that use explicit positions and shot targets. Test a receiver exactly on the front-corner target path, the existing front recovery zone, a cross-court counterpart with aligned/misaligned leans, and late movement from a rear position. Assert both the selected point and its quality components—not just `canReach`.
3. Use the trace to decide the smallest fix. First candidate to evaluate is whether recovery zones should represent a tactically balanced base position while the racket reach/contact-quality model should reward a forward/lateral lunge more appropriately. Do not move all zones or increase movement speed without comparing these cases.

**Risks:** Changing reach, sample selection, or quality weights affects every shot and the smash-unlock thresholds. Keep movement speed and shuttle flight unchanged in this phase.

### Part II — Balance and recovery

1. Add fixtures for repeated straight/cross net shots, varying only the actual starting position and preceding contact quality.
2. Log recovery start delay, movement distance possible before interception, actual movement completed, and residual distance. Confirm that an early comfortable contact can begin recovering promptly and that a deep lunge still costs time.
3. If a defect appears, change only the recovery rule responsible for it. Keep the shared human/CPU calculation and add parity tests.

**Risks:** Recovery delay changes may affect both attackers' ability to cover follow-up clears and the CPU's return quality. Do not adjust `MOVEMENT_SPEED` at the same time.

### Part III — Shuttle flight, shot balance, and CPU selection

1. Record actual clear landing depth, peak, source position, receiver start position, anticipated direction, selected sample, and contact components for the 1.67 s example.
2. For smashes, test front/mid/back defenders and aligned/opposite anticipation against the full post-net trajectory. Inspect landing depth and sample window before changing speed.
3. Log each CPU candidate's predicted reach, quality, fault risk, pressure score, random adjustment, and final choice. Compare choices over seeded scenarios before changing weights.
4. Calibrate flight/placement first; adjust CPU choice scores only after the mechanics produce credible shot outcomes.

**Risks:** Flight changes affect interception opportunities and CPU shot rankings simultaneously. Keep shot placement, flight timing, and CPU weights in separate changes.

## Regression coverage needed

The current suite passes 8/8, but it covers service sides, basic shot depth/fault behavior, interception quality bounds, and smash eligibility/power only. It does not cover the six movement and parity scenarios requested in the investigation brief.

Add deterministic tests for the six requested cases: aligned straight drop; cross drop; consecutive drops at different balance states; deep clear with correct/incorrect anticipation; smash with well-positioned/out-of-position defense; and equivalent CPU/human physical starting conditions. Each should assert both at least one success and one failure where appropriate. Existing random CPU ranking can be tested with injected/fixed randomness or by extracting a pure scoring helper; production random behavior should not be altered merely to make tests deterministic.

## Decision

Proceed with **diagnostics and Part I tests first**. The strongest current evidence is a mismatch between nominal recovery positions and actual drop target/contact geometry, plus a quality formula that penalizes the resulting extension. For smashes, inspect the near-net target and post-net sampling window before changing flight speed. Leave global movement speed, recovery thresholds, clear depth, and CPU weights unchanged until the phase-specific tests identify a cause.
