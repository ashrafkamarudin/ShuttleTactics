# Smash Defense Prototype — Iteration 2

**Decision: keep production unchanged.** This iteration improves the combined model: the mid-court target remains, vertical profiles are compared at fixed flight time, and anticipation affects both reaction delay and a short initial movement response. The results are more promising, especially at Center Right, but still do not establish a final design. Candidate A produces the clearest tested relationship; the bounded initial-speed coefficients are conspicuous and require telemetry/playtesting, and a correctly read wide attack is still only a very stretched, low-quality touch rather than a clean miss in this simplified interception model.

Only the prototype helper and deterministic prototype tests were changed. No production gameplay, UI, recovery, or shot files were modified.

## Prototype setup and separation of variables

Fixture attacker: `(x=.50, d=5.00, contact height=2.60m)`, contact quality `.92`, giving smash power `.7701`. Smash target depth is held at `3.20 - .45*power = 2.853455m`; target x is `+1.85m` straight or `-1.85m` cross. Production smash flight-time logic is unchanged. Linear horizontal interpolation is unchanged. Only vertical profile varies in the trajectory comparison.

The interception prototype continues to use production movement speed (3.65m/s), racket reach and lunge rules, reaction-delay basis, and sample geometry. The test helper's same movement/reach/stretch/contact calculation is used for all anticipation options; reachability is not treated as a guaranteed rally win.

## Landing role and geometry

At this fixture, targets all use x=+1.85m for straight shots. On the far court, depth d is measured from the net:

| Shot | Target/landing depth | x | Separation |
| --- | ---: | ---: | --- |
| Tight drop | .62m | 1.85m | front court |
| Normal drop | 1.15m | 1.85m | front court |
| Loose drop | 1.75m | 1.85m | front court |
| Smash | **2.853m** | 1.85m | 1.103m beyond the deepest drop target |
| Full clear | 5.90m | 1.85m | 3.047m deeper than smash |

So the tested smash remains in mid-court, not a drop. Its horizontal target is identical to the existing straight-shot convention. The trajectory's sampled positions approach this target and end at exactly `(1.85, 2.853455)`; corresponding cross shots end at `(-1.85, 2.853455)`. This prototype does not move the target to solve trajectory shape.

## Vertical trajectory comparison

All profiles use the same `.524408s` straight-smash flight and `.5369s` cross-smash flight from the existing speed formula. Horizontal path length/speed and target remain fixed. Heights below are for the straight fixture; vertical velocities are physical m/s, with negative values descending.

Profiles tested:

* **A — controlled quadratic:** `h = H + m₀t + (m₁-m₀)t²/2`, where terminal normalized slope `m₁=-1.4` and `m₀=2(.35-H)-m₁`. It begins with a downward attack and gradually reduces descent rate.
* **B — Hermite controlled-late curve:** cubic Hermite from launch height with zero initial slope to .35m with terminal normalized slope `-1.4`. It descends more slowly at the beginning, faster through mid-flight, then eases near landing.
* **C — current production control:** `h=H(1-t)+.35t-.96t(1-t)`.
* Previous rejected quadratic `h=H+(.35-H)t²` is included only as a late-descent comparator; it is not treated as a viable candidate.

| t | A height / vy | B height / vy | C height / vy | Rejected previous height / vy |
| ---: | ---: | ---: | ---: | ---: |
| 0% | 2.600m / -5.91 | 2.600m / 0.00 | 2.600m / -6.12 | 2.600m / 0.00 |
| 10% | 2.299m / -5.59 | 2.550m / -1.86 | 2.289m / -5.75 | 2.578m / -0.86 |
| 25% | 1.878m / -5.10 | 2.314m / -3.99 | 1.858m / -5.21 | 2.459m / -2.14 |
| 50% | 1.263m / -4.29 | 1.650m / -5.77 | 1.235m / -4.29 | 1.475m / -4.29 |
| 70% | .847m / -3.64 | 1.042m / -5.59 | .823m / -3.56 | .845m / -6.01 |
| 80% | .664m / -3.32 | .763m / -4.97 | .646m / -3.19 | .680m / -6.87 |
| 90% | .499m / -2.99 | .526m / -4.00 | .489m / -2.83 | .470m / -7.73 |
| 100% | .350m / **-2.67** | .350m / **-2.67** | .350m / **-2.46** | .350m / **-8.59** |

Terminal trajectory angles use horizontal speed `15.19m/s` for the straight fixture: A/B `-9.96°`, C `-9.20°`, rejected profile `-29.5°`. The A/C profiles have their maximum at launch (2.60m); B also peaks at launch because its derivative begins at zero and becomes negative immediately. The rejected curve also peaks at launch. The terminal velocity of the new A and B curves is about **2.67m/s downward**, rather than the rejected curve's 8.59m/s; at 90%, it is 2.99m/s rather than 7.73m/s.

**Assessment:** A is the most coherent of the new curves for an attacking smash: it keeps a clear downward angle throughout, has no terminal dive, and is close to the current curve while providing a controlled terminal slope. It is not a large enough change from C to claim a perceptible improvement. B meets the terminal bound but spends the middle of its short flight descending at up to 5.77m/s (about -21°), which makes it less convincing despite the controlled landing. The rejected profile is clearly too steep late. Neither A nor B changes flight time or landing zone; neither is a lob. These conclusions come from curve geometry, not visual animation review.

## Readiness model tested

Reaction delay plus a short initial movement response is tested; neither relocates the player nor grants contact quality directly.

| Read | Smash direction match | Reaction delay | Initial directional response |
| --- | --- | ---: | ---: |
| Neutral | balanced | .22s | none |
| Correct straight/cross read | exact | directional predicted-target delay -.08s; .04s floor | .30m impulse toward predicted direction |
| Wrong smash read | opposite | directional predicted-target delay +.22s; .39s cap | .30m impulse toward the wrong predicted direction |
| Smash read vs drop | mismatch | directional predicted-target delay +.17s; .39s cap | .15m impulse toward the predicted smash direction |

Movement budget is `max(0, movementTime*3.65 + dot(initialImpulse, directionToSample))`. The predicted direction is chosen from the anticipated smash target at 2.853m; reaction alignment is also measured against that predicted target. Correct reads project up to .30m toward the required movement, while wrong reads project the same initial movement vector against the actual path (often near zero or negative). A drop mismatch uses a smaller .15m impulse, and the smash-depth prediction points farther back than the drop's actual front-court path. This is a directional initial-response probe, not a position jump. These values are prototype coefficients and should not be accepted as final tuning.

The first prototype's small quality delta came from reaction differences often choosing contacts at similar stretch and the lack of initial directional response. The new predicted-target response changes movement budget and can change the selected sample/contact location. At Center Right against a straight smash, correct anticipation moves the selected contact from `(1.62,1.52)` to `(1.47,.65)`; estimated quality rises from .413 to .577. Wrong cross-read selects `(1.61,1.44)` and reaches .417. The wrong read is still reachable but yields worse contact. Thus the effect is visible in contact geometry, not just the reaction field.

## Combined interception matrix — profile A

Each row uses the same incoming shot/trajectory/target; only recovery position or anticipation changes. Contact time is elapsed time from the shot, and contact coordinates use the prototype's court coordinates. `reach?` denotes an available interception; `q` is the prototype contact estimate, not a rally-win probability. When no sample is reachable, the row shows the nearest sampled point, with the .15 fallback estimate.

| Recovery | Incoming | Read | Flight | Reaction | Move response | Reach? | Contact time | Contact point (x,d) | Distance / movement / racket reach | Stretch | Height | q |
| --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- | --- | ---: | ---: | ---: |
| Center-right | Straight | Neutral | .524 | .220 | 0 | yes | .435 | (1.62,1.52) | 2.11 / .79 / 1.75m | .76 | .61 | .413 |
| Center-right | Straight | Straight read | .524 | .040 | +1.8 | yes | .378 | (1.47,.65) | 2.78 / 1.52 / 1.75m | .72 | .81 | .579 |
| Center-right | Straight | Cross read | .524 | .311 | toward wrong predicted direction | yes | .461 | (1.69,1.91) | 1.86 / .54 / 1.75m | .75 | .53 | .406 |
| Center-right | Cross | Neutral | .537 | .220 | 0 | yes | .483 | (-1.62,2.07) | 2.27 / .96 / 1.75m | .75 | .50 | .405 |
| Center-right | Cross | Cross read | .537 | .040 | +1.8 | yes | .398 | (-1.24,.81) | 2.87 / 1.59 / 1.75m | .73 | .77 | .571 |
| Center-right | Cross | Straight read | .537 | .310 | toward wrong predicted direction | yes | .494 | (-1.66,2.23) | 2.24 / .57 / 1.75m | .95 | .47 | .308 |
| Rear-right | Straight | Neutral | .524 | .220 | 0 | yes | .503 | (1.80,2.54) | 2.31 / 1.03 / 1.75m | .73 | .41 | .401 |
| Rear-right | Straight | Straight read | .524 | .040 | toward correct direction | yes | .467 | (1.70,1.99) | 2.84 / 1.80 / 1.50m | .69 | .51 | .430 |
| Rear-right | Straight | Cross read | .524 | .310 | toward wrong predicted direction | yes | .514 | (1.82,2.70) | 2.17 / .90 / 1.75m | .72 | .38 | .400 |
| Rear-right | Cross | Neutral | .537 | .220 | 0 | no | .532 | (-1.83,2.77) | 3.73 / 1.14 / 1.75m | — | .36 | .150 |
| Rear-right | Cross | Cross read | .537 | .040 | toward correct direction | yes | .532 | (-1.83,2.77) | 3.73 / 2.09 / 1.75m | .94 | .36 | .302 |
| Rear-right | Cross | Straight read | .537 | .310 | toward wrong predicted direction | no | .532 | (-1.83,2.77) | 3.73 / .75 / 1.75m | — | .36 | .150 |
| Front-middle | Straight | Neutral | .524 | .220 | 0 | yes | .367 | (1.44,.50) | 1.82 / .54 / 1.75m | .73 | .85 | .577 |
| Front-middle | Straight | Straight read | .524 | .040 | toward correct direction | yes | .351 | (1.40,.26) | 1.94 / 1.14 / 1.75m | .45 | .90 | .710 |
| Front-middle | Straight | Cross read | .524 | .310 | toward wrong predicted direction | yes | .393 | (1.51,.89) | 1.67 / .02 / 1.75m | .94 | .75 | .472 |

Front-middle cross results are also covered by the deterministic matrix tests: neutral q=.603, correct cross q=.767, wrong straight q=.554; all are reachable. The front-middle position is not a canonical recovery zone but provides a less rear-oriented defensive fixture.

## Drop tradeoff, wide attack, and shot-role check

* At Center Right, neutral against a tight drop reaches a contact at `.819s`, quality `.573`. A straight-smash read against the same drop has `.277s` reaction delay and quality `.556`. Correct straight read against the smash is `.577`. The drop mismatch loses some readiness, though the contact remains reachable.
* A wide cross smash from attacker `(1,5)` to receiver Rear Right is **not a clean return even with the correct read**: it is technically reachable only at 3.72m separation against 1.75m racket extension plus movement, stretch .91 and estimated q=.311. Neutral and wrong reads cannot reach. The current prototype reports touch reach rather than rally outcome, so this is a poor-contact opportunity and remains capable of yielding a weak return; an actual point outcome is not modeled here.
* From Center Right, sample target/flight/interception comparison at the same attacker fixture:

| Shot | Landing depth | Landing x | Flight | Sample contact | Height | q |
| --- | ---: | ---: | ---: | --- | ---: | ---: |
| Tight drop | .62m | 1.85m | .891s | (1.74,.17) at .819s | .76m | .573 |
| Normal drop | 1.15m | 1.85m | .960s | (1.63,.17) at .806s | 1.30m | .585 |
| Smash | 2.853m | 1.85m | .524s | (1.62,1.52) at .435s, neutral | .61m | .413 |
| Full clear | 5.90m | 1.85m | 2.477s | (1.73,4.92) at 2.254s | 2.93m | .876 |

The drop values use the current normal-drop model; the clear uses the existing full-clear model. They preserve front/mid/deep landing roles. Their flight times and contact heights differ substantially.

Their trajectory peaks also distinguish the roles: a tight drop peaks at 1.30m, a normal drop at 1.65m, the smash starts at and then descends from its 2.60m overhead contact, and a full clear uses the 5.0m configured peak plus the existing .55m arc allowance (5.55m). The smash path is short and downward; drops rise modestly and land in front court; the clear uses its high/deep arc. The comparison holds target x at +1.85m for all straight shots.

## Regression/test status

Tests cover A/B/C endpoints, bounded terminal descent, unchanged flight time, target role separation, correct/neutral/wrong readiness effects through movement budget and stretch, recovery-position immutability, drop mismatch, wide attacks, and mirrored outcomes. Existing production tests continue to cover smash eligibility/power/direction, recovery zones, clear/drop, ordinary anticipation, and movement/reach.

* `node --test tests/smash-defense-prototype.test.js`: 6 passed.
* `npm test`: 35 passed.
* `git diff --check`: passed.

## Decision gate

1. **Most believable vertical candidate:** A. It has a continuous downward attack and a bounded terminal slope; however, it resembles current production closely. B controls terminal speed but descends most steeply in mid-flight. C is the unchanged control.
2. **Terminal velocity / previous dive:** A and B are -2.67m/s, below the rejected previous curve's -8.59m/s and lower than its -7.73m/s at 90%.
3. **Still a smash:** Yes, A descends continuously with about a -21° launch angle and lands at the unchanged mid-court target. It is a fast, short-flight attacking shot, not a lob.
4. **Flight window:** .524–.537s is unchanged from the current formula at the new target geometry. That is a plausible but short reaction window; centered exact reads now create a meaningful interception, while mismatches can miss.
5. **Anticipation materially helps:** Yes in this prototype. Center-right straight q rises .413 to .579 with a correct read; cross q .405 to .571. Movement budget and selected contact location change.
6. **Wrong/neutral:** Wrong reads are worse and sometimes still reachable (.406 center-right straight, .308 center-right cross, .400 rear-right straight). Neutral is the balanced choice; it defends some central attacks without committing to a direction.
7. **Drops:** Smash-specific read worsens tight-drop response (.573 neutral to .526 mismatch); neutral remains viable.
8. **Wide/bad recovery:** Correct-read Rear Right cross is technically reachable but extremely stretched at q=.300; neutral/wrong miss. This is still punishable, though success probability/outcome needs the real rally outcome model.
9. **Recovery separation:** Preserved; no anticipation changes receiver coordinates or recovery zones.
10. **Shot roles:** Smash 2.853m, drops .62–1.75m, clear 5.90m. Flight/contact geometry is visibly distinct in the samples.
11. **Overall believable interaction?** **Promising, not yet a pass.** Candidate A and the response gradient fix the weak Center Right effect, but the result relies on a strong initial-response coefficient (+1.8m/s for .16s) plus a .18s reaction shift. That combined advantage may be overpowered, and the simplified quality estimate does not model rally result. Playtest calibration and a trajectory visual review are still needed before production discussion.

**Recommendation:** Keep this model as the next test candidate, do not implement yet. First compare exact-read initial-response impulses across a small sweep (for example .10, .20, and .30m) and check the real rally outcome distribution on the same position matrix. Preserve the 2.853m mid-court target and current flight-time formula during that sweep. Candidate A is the best of these vertical profiles; do not adopt B based only on its controlled terminal velocity.

## Direct answers to the 20 requested checks

1. **Most believable profile:** A, though it is close to the current control.
2. **Terminal vertical velocity:** A/B are -2.67m/s; A avoids the rejected curve's terminal dive.
3. **Avoids the previous 7.3m/s dive:** Yes; the measured rejected candidate was -8.59m/s terminal and -7.73m/s at 90%.
4. **Still looks like a smash from its geometry:** Yes: short flight, continuously downward attack and mid-court target. It is not a lob.
5. **Preserves mid-court landing:** Yes, exactly 2.853455m in the fixture.
6. **Flight time reasonable:** .524–.537s for these representative attacks; not globally altered.
7. **Defensive window:** Short but usable when positioned and prepared; not generous.
8. **Correct anticipation material:** Yes, center-right quality estimates improve about .164–.168, with lower stretch and a different selected contact.
9. **Wrong read sometimes defendable:** Yes; center and rear straight attacks remain reachable with poorer estimates; the wide/cross cases can miss.
10. **Neutral balanced:** Yes, it remains a middle response and avoids committing to a direction.
11. **Physical movement affected:** Yes; reaction, projected initial movement, movement budget, selected point, stretch and contact estimate all change. No direct quality bonus is applied.
12. **Drop tradeoff:** Yes; center-right tight-drop quality falls .573 to .556 under a straight-smash read.
13. **Wide smash can beat a correct read:** It can prevent a comfortable return: correct-read Rear Right is only q=.311 at .91 stretch. The simplified model still registers a possible touch, so an actual rally outcome remains to be validated.
14. **Bad recovery punishable:** Yes; Rear Right versus cross is unreachable neutral/wrong and only a very stretched weak touch with the correct read.
15. **Recovery/anticipation separation:** Yes; anticipation does not change coordinates or zones.
16. **Smash mid-court:** Yes, target depth 2.853455m.
17. **Drop front-court:** Yes, targets .62/1.15/1.75m.
18. **Clear deep:** Yes, full clear target 5.90m.
19. **Distinct trajectory roles:** Yes in peak, height, flight duration and sampled interception point; the smash remains downward, drop peaks low, and clear peaks high.
20. **Believable full interaction:** More plausible, but **not conclusively validated**. Coefficients need a sweep and rally-outcome testing; keep the production gate closed.
