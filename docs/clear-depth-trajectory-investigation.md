# Clear Depth and Trajectory Investigation

## Scope

This investigation traces clear target selection through flight timing, vertical trajectory, landing, and receiver interception. It adds deterministic regression coverage only. No clear parameters, movement rules, shuttle physics, CPU decisions, or recovery positions were changed for this investigation.

The repeatable fixture uses a straight shot from `(0, 3.2)` toward the right target `(1.85, depth)`, with contact qualities `0.30`, `0.60`, `0.75`, and `1.00`. The receiver tests use the current front-right `(1.3, 1.6)`, centre-right `(0.35, 3.2)`, and rear-right `(1.3, 4.8)` recovery points. Depth is measured outward from the net; the baseline is at depth `6.7`.

## Clear and drop target results

| Contact quality | Clear label | Clear target depth | Actual landing depth | Peak height | Time to peak | Flight time | Net-crossing height | Horizontal travel |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 30% | weak | 3.07 m | 3.07 m | 3.38 m | 0.765 s | 1.587 s | 3.37 m | 6.54 m |
| 60% | reduced | 4.61 m | 4.61 m | 4.56 m | 0.919 s | 1.886 s | 4.47 m | 8.03 m |
| 75% | reduced | 5.39 m | 5.39 m | 5.16 m | 0.996 s | 2.036 s | 4.91 m | 8.78 m |
| 100% | full | 5.90 m | 5.90 m | 5.55 m | 1.047 s | 2.137 s | 5.17 m | 9.29 m |

The 75% row is intentionally labeled “reduced”: the engine's clear strength label remains `reduced` until its calculated power reaches 0.97 (about 83% contact quality). This is a label threshold, separate from the continuous target-depth mapping.

Drop targets for the same contact qualities are `1.75 m`, `1.15 m`, `1.15 m`, and `0.62 m`. So the weak clear lands `1.32 m` deeper than even the loosest drop target. At `3.07 m` from the net it is in midcourt, not the front-court drop region. The full clear lands `0.80 m` short of the baseline.

For the weak-clear fixture, flight length is `6.54 m` because the engine computes horizontal travel from source to target as `sqrt((Δx)^2 + (source depth + landing depth)^2)`. The equivalent loose drop travels `5.29 m` and takes `0.825 s` in the same formula.

## How the path and timing are produced

`shotTarget()` maps clamped quality to power with `(quality - 0.18) / 0.67`, then interpolates depth from `2.45 m` to `5.90 m` and the peak parameter from `2.35 m` to `5.00 m`. Power saturates at contact quality `0.85`; above that, depth and height no longer increase. The 30% weak fixture therefore does not approach the drop target range.

The clear's vertical path is the parabola `0.75(1-t) + 0.35t + peak·4t(1-t)`. It begins at `0.75 m`, ends at `0.35 m`, and reaches the table's peak heights at the listed times. Its horizontal path is linear in normalized time and ends at the configured `(x, depth)` target. There is no shuttle deceleration or separate landing adjustment in this path. The endpoint is always the target depth. Flight time is computed separately from horizontal distance at `5.0 m/s`, plus a `0.28 s` clear allowance, then clamped to `1.30–3.15 s`.

## What a 1.30-second weak clear indicates

The observed `1.30 s` is the minimum flight-time clamp. It does not, by itself, mean the clear landed in the front court. In this standard fixture, a weak clear takes `1.587 s` and lands at `3.07 m`. With the same 30% contact quality but a front-court source at `(0, 1.6)`, it still targets depth `3.07 m`; the raw flight estimate is about `1.284 s`, so the clamp raises it to `1.30 s`.

Thus a log showing a 1.30-second weak clear can come from a shorter source-to-target distance while still ending in midcourt. The current log duration alone cannot establish a front-court landing. The target/landing depth and source position are needed to diagnose that event.

## Receiver movement and interception

The table below reports the first reachable sample selected by the deterministic interception sampler. “Movement distance” is the receiver's distance to that sampled shuttle point, including neither racket extension nor elapsed-time movement budget; reach is accounted for separately by the engine.

| Clear | Receiver start | Selected time | Contact height | Interception point `(x, depth)` | Movement distance | Contact quality |
| --- | --- | ---: | ---: | --- | ---: | ---: |
| Weak | Front-right | 1.254 s | 2.31 m | `(1.46, 1.75)` | 0.22 m | 89.8% |
| Weak | Centre-right | 1.254 s | 2.31 m | `(1.46, 1.75)` | 1.83 m | 89.8% |
| Weak | Rear-right | 1.254 s | 2.31 m | `(1.46, 1.75)` | 3.05 m | 89.8% |
| Reduced | Front-right | 1.509 s | 3.00 m | `(1.48, 3.05)` | 1.46 m | 89.6% |
| Reduced | Centre-right | 1.509 s | 3.00 m | `(1.48, 3.05)` | 1.14 m | 89.6% |
| Reduced | Rear-right | 1.509 s | 3.00 m | `(1.48, 3.05)` | 1.76 m | 89.6% |
| 75% quality | Front-right | 1.690 s | 3.02 m | `(1.54, 3.93)` | 2.34 m | 89.1% |
| 75% quality | Centre-right | 1.690 s | 3.02 m | `(1.54, 3.93)` | 1.39 m | 89.1% |
| 75% quality | Rear-right | 1.690 s | 3.02 m | `(1.54, 3.93)` | 0.91 m | 89.1% |
| Full | Front-right | 1.817 s | 2.96 m | `(1.57, 4.54)` | 2.95 m | 88.7% |
| Full | Centre-right | 1.817 s | 2.96 m | `(1.57, 4.54)` | 1.81 m | 88.7% |
| Full | Rear-right | 1.817 s | 2.96 m | `(1.57, 4.54)` | 0.38 m | 88.7% |

All nine receiver/clear combinations are reachable. Position changes the distance demand substantially: the front player has the shortest move against a weak clear and the rear player has the shortest move against a full clear. In this fixture, however, contact quality barely changes by starting position because the selected points fall inside each receiver's movement budget and all three get zero stretch penalty. The front player can reach the weak clear's early interception just beyond depth `1.75 m`, despite the shuttle's eventual midcourt landing. That early interception is a likely explanation for why a weak clear can feel like it leaves the opponent forward and ready, even though it does not land like a drop.

These are model outputs, not evidence that every real rally has the same outcome. Anticipation, source position, lateral direction, receiver position, and other game state alter the interception sample and contact score.

## Findings

1. **Weak clears do not overlap drop landing depth.** The tested weak clear lands at `3.07 m`; the loosest drop lands at `1.75 m`. Quality-to-depth ordering is monotonic across the four fixtures.
2. **Target depth is actual landing depth.** The trajectory's normalized endpoint is the configured target; no hidden landing correction pulls clears forward.
3. **The 1.30-second duration is caused by the minimum flight clamp in a short-distance case.** It does not prove a front-court landing. For the same weak quality, the source at depth `1.6 m` yields a midcourt target and the clamped 1.30-second duration.
4. **Trajectory generation is consistent with the target.** Increasing clear quality increases both target depth and peak; the vertical curve reaches its listed maximum before descending to its endpoint.
5. **The tactical concern is more likely interception timing/recovery experience than landing placement alone.** A front receiver can contact the weak clear at depth `1.75 m` after `1.254 s`, while the clear is still travelling toward depth `3.07 m`. The existing quality formula also gives this fixture effectively equal, high quality at all three recovery positions because none is stretched.

## Recommendation

The primary acceptance criterion is met: weak clears remain clearly deeper than the drop region and reach midcourt. Current evidence does not justify changing clear depth, peak, global speed, or other shot parameters. The smallest justified next step is to add source position, target/landing depth, and selected interception point/time to the rally diagnostics, then compare those values from the reported 1.30-second rallies. If those logs confirm that early interceptions make weak clears tactically indistinguishable from drops, adjust only the clear interception/quality treatment in a separately reviewed tuning pass. No gameplay fix is included here.

## Regression coverage

`tests/clear-trajectory.test.js` fixes the quality/depth ordering, clear-versus-drop separation, target-to-landing endpoint, clear timing and trajectory values, position-dependent movement distances, and left/right symmetry. It is intended to detect future changes to these observed behaviors without locking in a speculative rebalance.
