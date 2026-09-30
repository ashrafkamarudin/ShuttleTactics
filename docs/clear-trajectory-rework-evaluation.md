# Clear Trajectory Rework Evaluation

## Decision

I evaluated a test-only trajectory profile against the current game equations. It keeps the current target, launch and landing heights, peak-height intent, and total flight time. It makes the path travel more of its distance early, keeps the shuttle high until late in the flight, and then descends sharply.

The candidate does move a full-clear contact point later and deeper for a front receiver. However, the existing reach and contact-quality model still gives front, centre, and rear receivers the same high contact quality: all three can reach the chosen point without stretch. Therefore, the candidate alone does **not** meet the requirement that good rear positioning produce a meaningfully more comfortable deep-clear contact. I did not change production gameplay or retain a prototype in production code. A separate interception-model proposal is needed before deciding whether to implement a new path.

## Phase 0: current implementation

The trace is `shotTarget()` → `flightTime()` → `trajectoryHeight()` and the controller's linear court interpolation → `qualityAt()`'s sampled contact points.

* **Target mapping:** for a clear, `power = clamp((quality - 0.18) / 0.67, 0, 1)`. Depth interpolates from `2.45` to `5.90 m`, and the peak parameter interpolates from `2.35` to `5.00`. Contact qualities 30%, 60%, 75%, and 100% produce depths `3.07`, `4.61`, `5.39`, and `5.90 m`, and peak parameters `2.82`, `4.01`, `4.60`, and `5.00 m`.
* **Flight time:** `clamp(length / 5 + 0.28, 1.30, 3.15)`, where `length = sqrt((target.x - source.x)^2 + (target.d + source.d)^2)`. The fixture `(0, 3.2)` to `(1.85, target depth)` produces `1.587`, `1.886`, `2.036`, and `2.137 s` respectively.
* **Horizontal position:** the controller linearly interpolates x and court depth by normalized flight time. In the signed court coordinate used below, source depth is `-3.2`, target depth is positive, and net is zero. The solver's current opponent-side depth expression is also linear after its net crossing.
* **Vertical position:** `h(t) = 0.75(1-t) + 0.35t + 4Pt(1-t)`, where `P` is the target peak parameter. The actual maximum is `P + 0.55 m`; the maximum's normalized time is `(1 - 0.1/P)/2`.
* **Velocity:** current horizontal components are constant: `vx = (target.x-source.x)/flight`, `vz = (source.d+target.d)/flight`. Vertical velocity is `(0.4 + 4P(1-2t))/flight`. The game does not simulate aerodynamic deceleration; these are derivatives of its animation path, not a separate shuttle dynamics model.
* **Interception:** `qualityAt()` samples `t=0.06…0.99`, skips times before net crossing plus 2.5%, heights outside `0.32…3.05 m`, and clear contacts shallower than `1.75 m`. It computes movement budget as `(elapsed - reaction) × 3.65 m/s` plus racket reach (`0.65 m`, with lunge additions). It chooses the first reachable sample with margin greater than `0.42 m`, or the fourth reachable sample. Quality is then reduced by stretch and low height; it has no penalty for contacting a deep clear from a forward position if the player reaches that sample without stretch.

The earlier clear-depth investigation's target/drop and recovery tests were run before this evaluation. The candidate comparison below uses a deterministic copy of the same movement, reach, sampling, and contact-quality rules with only the trajectory path changed.

## Candidate definition (evaluation only)

For normalized time `t`, the candidate uses the front-loaded progress curve:

```text
p(t) = 1 - (1 - t)^1.4
x(t) = source.x + (target.x - source.x) p(t)
z(t) = -source.d + (source.d + target.d) p(t)
```

It preserves the same endpoint and total flight time. Its horizontal velocity is `p'(t) × displacement / flight`, where `p'(t) = 1.4(1-t)^0.4`. At 25%, 50%, 70%, 80%, and 90% of flight, progress is about 33%, 62%, 82%, 91%, and 96%, versus 25%, 50%, 70%, 80%, and 90% currently.

For vertical motion, let `A = P + 0.55 m`, preserving the current actual maximum. The prototype was:

```text
u = t / 0.30                         for 0 ≤ t ≤ 0.30
h = 0.75 + (A - 0.75)(1 - (1-u)^2)

u = (t - 0.30) / 0.40                for 0.30 < t ≤ 0.70
h = A - 0.15(3u² - 2u³)

u = (t - 0.70) / 0.30                for 0.70 < t ≤ 1
h = A - 0.15 + (0.35 - (A - 0.15))u²
```

This reaches `A` at 30% of flight, stays within 0.15 m of the peak through 70%, then eases into a steep final descent. It retains `h(0)=0.75 m`, `h(1)=0.35 m`, and the existing peak maximum. The candidate is intentionally not installed in the game; it is a comparison profile.

## Current vs candidate trajectory samples

Coordinates are `(x, signed depth-from-net)`, in metres. Velocities are `(vx, vz, vy)` in m/s; positive `vz` travels toward the opponent's rear court and positive `vy` rises. Remaining distance is the target-depth distance after crossing the net. Flight time for both paths is unchanged at each quality.

### 30% contact, weak clear — flight 1.587 s

| Flight fraction | Current position | Height | Velocity | Remaining | Candidate position | Height | Velocity | Remaining |
| ---: | --- | ---: | --- | ---: | --- | ---: | --- | ---: |
| 25% | (0.46, -1.63) | 2.77 | (1.17, 3.95, 3.81) | 4.70 | (0.61, -1.12) | 3.30 | (1.45, 4.93, 1.84) | 4.19 |
| 50% | (0.93, -0.07) | 3.37 | (1.17, 3.95, 0.25) | 3.13 | (1.15, 0.69) | 3.30 | (1.24, 4.19, -0.35) | 2.38 |
| 70% | (1.29, 1.19) | 2.84 | (1.17, 3.95, -2.60) | 1.88 | (1.51, 1.91) | 3.22 | (1.01, 3.42, 0.00) | 1.16 |
| 80% | (1.48, 1.81) | 2.24 | (1.17, 3.95, -4.02) | 1.25 | (1.66, 2.41) | 2.91 | (0.86, 2.90, -4.03) | 0.66 |
| 90% | (1.67, 2.44) | 1.41 | (1.17, 3.95, -5.44) | 0.63 | (1.78, 2.82) | 1.95 | (0.65, 2.20, -8.05) | 0.25 |
| 100% | (1.85, 3.07) | 0.35 | (1.17, 3.95, -6.87) | 0.00 | (1.85, 3.07) | 0.35 | (0.00, 0.00, -12.08) | 0.00 |

### 60% contact, reduced clear — flight 1.886 s

| Flight fraction | Current position | Height | Velocity | Remaining | Candidate position | Height | Velocity | Remaining |
| ---: | --- | ---: | --- | ---: | --- | ---: | --- | ---: |
| 25% | (0.46, -1.25) | 3.66 | (0.98, 4.14, 4.47) | 5.86 | (0.61, -0.61) | 4.46 | (1.22, 5.17, 2.25) | 5.22 |
| 50% | (0.93, 0.71) | 4.56 | (0.98, 4.14, 0.21) | 3.91 | (1.15, 1.65) | 4.49 | (1.04, 4.40, -0.30) | 2.96 |
| 70% | (1.29, 2.27) | 3.84 | (0.98, 4.14, -3.19) | 2.34 | (1.51, 3.16) | 4.41 | (0.85, 3.58, 0.00) | 1.45 |
| 80% | (1.48, 3.05) | 3.00 | (0.98, 4.14, -4.89) | 1.56 | (1.66, 3.79) | 3.96 | (0.72, 3.05, -4.79) | 0.82 |
| 90% | (1.67, 3.83) | 1.83 | (0.98, 4.14, -6.59) | 0.78 | (1.78, 4.30) | 2.61 | (0.55, 2.31, -9.57) | 0.31 |
| 100% | (1.85, 4.61) | 0.35 | (0.98, 4.14, -8.30) | 0.00 | (1.85, 4.61) | 0.35 | (0.00, 0.00, -14.36) | 0.00 |

### 75% contact, reduced label — flight 2.036 s

| Flight fraction | Current position | Height | Velocity | Remaining | Candidate position | Height | Velocity | Remaining |
| ---: | --- | ---: | --- | ---: | --- | ---: | --- | ---: |
| 25% | (0.46, -1.05) | 4.10 | (0.91, 4.22, 4.72) | 6.44 | (0.61, -0.35) | 5.03 | (1.13, 5.26, 2.40) | 5.74 |
| 50% | (0.93, 1.09) | 5.15 | (0.91, 4.22, 0.20) | 4.29 | (1.15, 2.13) | 5.08 | (0.96, 4.47, -0.28) | 3.25 |
| 70% | (1.29, 2.81) | 4.34 | (0.91, 4.22, -3.42) | 2.58 | (1.51, 3.79) | 5.00 | (0.79, 3.65, 0.00) | 1.59 |
| 80% | (1.48, 3.67) | 3.38 | (0.91, 4.22, -5.23) | 1.72 | (1.66, 4.48) | 4.49 | (0.67, 3.10, -5.08) | 0.90 |
| 90% | (1.67, 4.53) | 2.05 | (0.91, 4.22, -7.04) | 0.86 | (1.78, 5.04) | 2.94 | (0.51, 2.35, -10.16) | 0.34 |
| 100% | (1.85, 5.39) | 0.35 | (0.91, 4.22, -8.85) | 0.00 | (1.85, 5.39) | 0.35 | (0.00, 0.00, -15.24) | 0.00 |

### 100% contact, full clear — flight 2.137 s

| Flight fraction | Current position | Height | Velocity | Remaining | Candidate position | Height | Velocity | Remaining |
| ---: | --- | ---: | --- | ---: | --- | ---: | --- | ---: |
| 25% | (0.46, -0.92) | 4.40 | (0.87, 4.26, 4.87) | 6.83 | (0.61, -0.18) | 5.42 | (1.08, 5.31, 2.50) | 6.08 |
| 50% | (0.93, 1.35) | 5.55 | (0.87, 4.26, 0.19) | 4.55 | (1.15, 2.45) | 5.47 | (0.92, 4.52, -0.26) | 3.45 |
| 70% | (1.29, 3.17) | 4.67 | (0.87, 4.26, -3.56) | 2.73 | (1.51, 4.21) | 5.40 | (0.75, 3.68, 0.00) | 1.69 |
| 80% | (1.48, 4.08) | 3.63 | (0.87, 4.26, -5.43) | 1.82 | (1.66, 4.94) | 4.84 | (0.64, 3.13, -5.25) | 0.96 |
| 90% | (1.67, 4.99) | 2.19 | (0.87, 4.26, -7.30) | 0.91 | (1.78, 5.54) | 3.16 | (0.48, 2.37, -10.50) | 0.36 |
| 100% | (1.85, 5.90) | 0.35 | (0.87, 4.26, -9.17) | 0.00 | (1.85, 5.90) | 0.35 | (0.00, 0.00, -15.75) | 0.00 |

The candidate does not shorten flight time: each row uses exactly the same existing clear flight-time calculation as its current-path counterpart. It does redistribute the position and velocity: the shuttle travels farther down court early, slows its horizontal progress near the endpoint, stays near peak height longer, then descends much faster.

## Phase 4: interception comparison

Receiver positions are front-right `(1.3, 1.6)`, centre-right `(0.35, 3.2)`, and rear-right `(1.3, 4.8)`. Movement budget is the solver's movement distance after anticipation delay; racket reach is reported separately. “Selected” is the contact chosen by the current first-comfortable-sample rule. Candidate uses the same scan and quality equation with the candidate path substituted. Values are rounded.

### Weak clear, 30% quality

| Receiver | Path | Earliest reachable / selected time | Selected depth, height | Movement distance / budget | Racket reach | Stretch | Quality |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: |
| Front | Current | 1.254 s | 1.75 m, 2.31 m | 0.22 / 3.77 m | 0.65 m | 0.00 | 89.8% |
| Centre | Current | 1.254 s | 1.75 m, 2.31 m | 1.83 / 3.77 m | 1.75 m | 0.00 | 89.8% |
| Rear | Current | 1.254 s | 1.75 m, 2.31 m | 3.05 / 3.77 m | 1.50 m | 0.00 | 89.8% |
| Front | Candidate | 1.238 s | 2.32 m, 3.02 m | 0.79 / 3.72 m | 0.80 m | 0.00 | 90.0% |
| Centre | Candidate | 1.238 s | 2.32 m, 3.02 m | 1.55 / 3.72 m | 1.75 m | 0.00 | 90.0% |
| Rear | Candidate | 1.238 s | 2.32 m, 3.02 m | 2.51 / 3.72 m | 1.50 m | 0.00 | 90.0% |

This remains an attackable weak clear and is intercepted forward. Candidate profile changes the selected point modestly; it does not make the weak clear behave like a deep one.

### Full clear, 100% quality

| Receiver | Path | Earliest reachable / selected time | Selected depth, height | Movement distance / budget | Racket reach | Stretch | Quality |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: |
| Front | Current | 1.817 s | 4.54 m, 2.96 m | 2.95 / 5.83 m | 0.80 m | 0.00 | 88.7% |
| Centre | Current | 1.817 s | 4.54 m, 2.96 m | 1.81 / 5.83 m | 1.05 m | 0.00 | 88.7% |
| Rear | Current | 1.817 s | 4.54 m, 2.96 m | 0.38 / 5.83 m | 1.50 m | 0.00 | 88.7% |
| Front | Candidate | 1.945 s | 5.59 m, 2.93 m | 4.02 / 6.30 m | 1.05 m | 0.00 | 87.6% |
| Centre | Candidate | 1.945 s | 5.59 m, 2.93 m | 2.79 / 6.30 m | 1.05 m | 0.00 | 87.6% |
| Rear | Candidate | 1.945 s | 5.59 m, 2.93 m | 0.93 / 6.30 m | 1.05 m | 0.00 | 87.6% |

The candidate moves the full-clear interception point 1.05 m deeper and 0.128 s later for every starting position. The rear receiver has a substantially shorter movement distance than the front receiver, but all receivers' movement budgets exceed their requirements. Since stretch remains zero and the selected time and height are shared, quality is identical. Rear > centre > front therefore holds for movement effort, but not for contact comfort/quality.

Left/right geometry is symmetric by construction; existing clear tests cover mirrored target and interception outcomes for the current path. The candidate formula changes only longitudinal progress and is independent of side.

## Conclusion and next step

The candidate demonstrates the desired path shape without increasing overall clear speed or changing clear targets. For a full clear, it creates a later, deeper overhead point and increases forward-to-rear movement distance while preserving reachability. It does **not**, on its own, make starting position alter contact quality: the existing solver allows even the front receiver enough time to reach that deeper point comfortably.

So the candidate partially addresses retreat positioning but does not meet the full tactical requirement as stated. I recommend no production trajectory change yet. The next smallest investigation is a separate interception-model prototype that compares early forward contact against a later overhead contact and accounts for whether a receiver is behind/under the shuttle. That can be evaluated without changing speed, movement parameters, or clear targeting. If the contact model remains unchanged, this trajectory profile alone would not make a front player less comfortable than a rear player.

No gameplay source or test files were modified for this rework evaluation. Existing deterministic tests and the previous clear-depth report remain as-is; the new evaluation report is the only added artifact.
