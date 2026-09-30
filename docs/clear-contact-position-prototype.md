# Clear Trajectory and Contact-Position Prototype

## Decision

The combined deterministic prototype meets the requested behavior for the required fixture matrix. It keeps target depth and total flight time unchanged, preserves reachability, and gives front/centre/rear receivers progressively better contact quality on full clears. Weak clears remain early and smash-eligible for the forward receiver. I am proceeding to a localized production implementation and will retain regression coverage for these relationships.

All work up to this decision used only test-support code in `tests/clear-contact-prototype.js`; production gameplay files were unchanged during the prototype run.

## Current model inspected

* Clear `shotTarget()` computes `power = clamp((quality - 0.18) / 0.67, 0, 1)`, interpolating depth from 2.45 to 5.90 m and peak parameter from 2.35 to 5.00 m. At 30%, 60%, and 100% contact quality, depths are 3.07, 4.61, and 5.90 m.
* Clear flight time is `clamp(length / 5 + 0.28, 1.30, 3.15)`, where `length = hypot(target.x - source.x, target.d + source.d)`. For the `(0, 3.2)` source and straight target x=1.85, the weak, reduced, and full fixtures take 1.587, 1.886, and 2.137 s.
* The controller represents the court longitudinally in world z: the hitter side is negative and the receiver side positive. Receiver/recovery positions use local positive depth measured away from the net. The current controller interpolates x/z linearly; current vertical height is `0.75(1-t) + 0.35t + 4Pt(1-t)`.
* The receiver starts at its current/recovery `(x, depth)`. The solver gives it `3.65 m/s` movement after a 0.22 s neutral-anticipation delay, plus existing racket/lunge reach (0.65 m base, with the current front/side/back additions). It samples t=0.06…0.99, requires clear contacts at least 1.75 m deep, and permits contact heights 0.32–3.05 m.
* `qualityAt()` chooses the first reachable sample with more than 0.42 m reach margin, or the fourth reachable sample. Existing quality is `clamp(0.86 + 0.18×timing - 0.46×stretch - low-height penalty, 0.18, 1)`. Before this prototype, it had no direct adjustment for retreat effort or the shuttle being deeper than the receiver's comfortable overhead reach.

## Combined prototype

### Candidate clear trajectory

The horizontal progress repeats the prior evaluation's candidate:

```text
p(t) = 1 - (1-t)^1.4
x(t) = source.x + (target.x-source.x)p(t)
z(t) = -source.d + (source.d+target.d)p(t)
```

Vertical height repeats its piecewise candidate with `A=P+0.55 m`: a quadratic rise to A at 30%, a shallow smoothstep decrease of 0.15 m through 70%, then a quadratic descent to the existing 0.35 m landing height. Thus the same clear target, target depth, peak maximum, launch/landing heights, and `flightTime()` remain in use. The candidate only moves differently inside that existing flight time.

### Contact-position modifier

The prototype retains the existing reachable test, movement budget, racket reach, selected contact point, stretch, and base quality. It then applies two gradual terms derived from that contact:

```text
retreatDistance = max(0, selectedDepth - receiverStartDepth)
retreatEffort = clamp(retreatDistance / availableFootworkDistance, 0, 1)
retreatLoss = 0.10 × retreatEffort

behindDistance = max(0, selectedDepth - receiverStartDepth - baseRacketReach)
behindFraction = clamp(behindDistance / (targetDepth - receiverStartDepth), 0, 1)
behindLoss = 0.10 × behindFraction

finalQuality = clamp(existingQuality - retreatLoss - behindLoss, 0.18, 1)
```

The existing 0.65 m racket reach defines the comfortable overhead allowance. Retreat effort compares the actual depth change with the movement capacity available before contact, rather than using a fixed movement-distance cutoff. Both terms use the same formula for every receiver; no recovery-zone labels or front-player rule enter the calculation. The diagnostic result reports base quality, each modifier component, and final quality separately.

The coefficients are prototype tuning values. They are capped by the existing quality floor and require playtesting before balancing can be considered final.

## Deterministic results

Fixture source is `(0, 3.2)`; straight target is on the right at x=1.85. Receiver starts are front-right `(1.3, 1.6)`, centre-right `(0.35, 3.2)`, rear-right `(1.3, 4.8)`. For all rows, earliest reachable time equals selected time in this deterministic fixture; all contacts are reachable and stretch is zero. `Movement` is geometric distance to the contact point; `budget` is distance the solver permits the player to move before contact.

| Quality | Receiver | Contact time | Depth / height | Movement / budget | Racket reach | Base quality | Retreat loss | Behind loss | Final quality |
| ---: | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 30% weak | Front | 1.238 s | 2.32 / 3.02 m | 0.79 / 3.72 m | 0.80 m | 0.900 | 0.023 | 0.005 | 0.876 |
| 30% weak | Centre | 1.238 s | 2.32 / 3.02 m | 1.55 / 3.72 m | 1.75 m | 0.900 | 0 | 0 | 0.900 |
| 30% weak | Rear | 1.238 s | 2.32 / 3.02 m | 2.51 / 3.72 m | 1.50 m | 0.900 | 0 | 0 | 0.900 |
| 60% reduced | Front | 1.659 s | 4.21 / 2.95 m | 2.65 / 5.25 m | 1.05 m | 0.882 | 0.050 | 0.065 | 0.767 |
| 60% reduced | Centre | 1.659 s | 4.21 / 2.95 m | 1.73 / 5.25 m | 1.05 m | 0.882 | 0.019 | 0.026 | 0.837 |
| 60% reduced | Rear | 1.659 s | 4.21 / 2.95 m | 0.74 / 5.25 m | 1.75 m | 0.882 | 0 | 0 | 0.882 |
| 100% full | Front | 1.945 s | 5.59 / 2.93 m | 4.02 / 6.30 m | 1.05 m | 0.876 | 0.063 | 0.078 | 0.735 |
| 100% full | Centre | 1.945 s | 5.59 / 2.93 m | 2.79 / 6.30 m | 1.05 m | 0.876 | 0.038 | 0.064 | 0.774 |
| 100% full | Rear | 1.945 s | 5.59 / 2.93 m | 0.93 / 6.30 m | 1.05 m | 0.876 | 0.013 | 0.012 | 0.851 |

Against the full clear, front is still physically reachable and never becomes an automatic miss. Its contact quality falls below the existing 0.76 “comfortable” label threshold. Centre and rear remain above that threshold, and rear is highest. Against the weak clear, the front receiver reaches the shuttle at 1.238 s with 0.876 quality, height 3.02 m, and zero stretch; that remains above the existing smash eligibility quality threshold of 0.75. Centre/rear receive no retreat modifier when the weak clear is in front of their starting depth.

Reduced quality falls between weak and full for each receiver: front 0.767, centre 0.837, rear 0.882. The pattern comes from the contact-depth and movement-capacity ratios; the function does not branch on “front”, “centre”, or “rear”.

## Symmetry and non-goals checks

The left/right mirrored full, reduced, and weak fixtures produce equal depth, time, movement, modifier components, and quality, with mirrored x contact points. The candidate uses the existing `flightTime()` output for every sample. It does not change movement speed, racket reach, anticipation delay, target mapping, recovery zones, smash rules, or drop rules. Existing smash/drop tests remain in the suite.

## Decision-gate answers

**A. Does rear positioning become more comfortable than centre/front?** Yes. Full-clear final qualities are 0.735, 0.774, and 0.851 from front to rear, with zero stretch in all three; the difference is specifically from the gradual retreat/behind-position modifiers.

**B. Can a poorly positioned player still reach the shuttle?** Yes. The full-clear front fixture remains reachable at 1.945 s with a 4.02 m movement demand against a 6.30 m budget, plus the same 1.05 m racket reach.

**C. Are weak clears still attackable?** Yes. The front receiver gets a reachable, high, unstretched contact with 0.876 final quality, satisfying existing smash eligibility.

**D. Does the model avoid artificial speed or global difficulty changes?** Yes. It retains the computed flight times, 3.65 m/s movement speed, racket reach, and target mapping. Only contact quality depends on movement and contact geometry.

**E. Does behavior emerge from mechanics rather than scripted outcomes?** Yes. The modifier is calculated from retreat distance relative to available movement and contact depth relative to the player's starting depth and racket reach. No receiver identity or shot outcome is hard-coded.

## Test-first verification

The prototype initially passed 27 deterministic tests, including five new prototype-only tests, before production changes. Those tests covered preserved target/time, reachable quality gradients, weak-clear smash eligibility, reduced-clear intermediate outcomes, and mirrored results. The prototype implementation and its detailed per-contact outputs live in `tests/clear-contact-prototype.js` and `tests/clear-contact-prototype.test.js`.
