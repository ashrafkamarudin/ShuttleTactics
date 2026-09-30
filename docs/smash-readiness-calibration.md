# Smash Readiness Calibration Sweep

**Decision: keep production unchanged.** The smallest tested initial response, **0.10m**, is the conservative choice if an initial directional response is retained. However, the reaction-delay reduction alone produces most of the correct-read benefit. Moving from 0.10m to 0.30m barely changes Center Right quality and does not improve most other positions. A 0.10m impulse is therefore only a tentative prototype recommendation, not a production-ready result.

The sweep changes only exact/wrong smash-read initial directional response. Frozen variables are Candidate A, target depth `3.20 - .45*power`, straight/cross target x, production flight-time formula, linear horizontal progression, movement speed, racket reach and contact-quality formula. Response duration remains .16s; the three tested distances correspond to .625, 1.25 and 1.875m/s over that window. Reaction delay remains neutral .22s, exact .04s, wrong about .31s, and smash-read-vs-drop .277s for this fixture.

No production gameplay/UI/recovery/shot files were modified. A zero-impulse control is included only to isolate the reaction component, as required by the question “is reaction alone enough?”

## Center Right quality comparison

Neutral q does not change with initial-response strength. “Correct” and “wrong” are relative to the incoming smash direction.

| Response | Straight neutral | Straight correct | Straight wrong | Correct Δ | Wrong Δ | Cross neutral | Cross correct | Cross wrong | Correct Δ | Wrong Δ |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| .10m | .413 | .569 | .407 | +.156 | -.006 | .405 | .555 | .319 | +.150 | -.086 |
| .20m | .413 | .573 | .407 | +.160 | -.006 | .405 | .564 | .316 | +.159 | -.089 |
| .30m | .413 | .577 | .406 | +.164 | -.007 | .405 | .573 | .308 | +.168 | -.097 |

The wrong-read straight q is close to neutral at Center Right; wrong cross-read is clearly worse. The directional readiness effect therefore depends on geometry and anticipated side rather than producing a uniform quality multiplier.

## Center Right physical contact comparison

Neutral remains the same for each candidate. The detailed straight-smash correct-read contact is:

| Response | Reaction | Contact time | Contact point (x,d) | Shuttle distance | Movement budget | Initial projection | Racket reach | Stretch | Height | q |
| ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Neutral | .220s | .435s | (1.621,1.518) | 2.11m | .79m | 0 | 1.75m | .76 | .61m | .413 |
| .10m | .040s | .388s | (1.499,.812) | 2.65m | 1.36m | .094m | 1.75m | .735 | .77m | .569 |
| .20m | .040s | .383s | (1.486,.733) | 2.72m | 1.44m | .188m | 1.75m | .730 | .79m | .573 |
| .30m | .040s | .378s | (1.472,.654) | 2.78m | 1.51m | .280m | 1.75m | .726 | .81m | .577 |

The selected contact changes smoothly: each 0.10m increase moves the contact about 8cm toward the net, increases projected movement by about 9cm, lowers stretch only about .005, and raises q about .004–.005. There is no comfortable-contact jump in this fixture. By contrast, neutral-to-correct-read changes mostly come from the fixed .18s reaction reduction.

### Reaction-only control

With a correct straight read but a zero initial impulse, Center Right produces q=.564 at `.393s`, point `(1.513,.890)`, 1.29m movement budget, .741 stretch and .75m height. Against neutral q=.413, this is a +.151 quality change with no initial response. Adding .10m changes q by only another .005 and moves contact about 8cm earlier. **Reaction readiness alone is already enough to create a meaningful difference in this fixture.**

## Position and direction sweep

Each cell is `reaction / selected contact (x,d) / movement budget / reach / stretch / height / q / result`. Distance to the selected shuttle point is in metres. A dash for stretch means no reachable interception. Candidate A, target and flight remain fixed across the full sweep.

### 0.10m initial response

| Position | Incoming | Read | Result |
| --- | --- | --- | --- |
| Center Right | straight | neutral | `.220 / (1.62,1.52) / .79 / 1.75 / .76 / .61 / .413 / reachable` |
| Center Right | straight | straight | `.040 / (1.50,.81) / 1.36 / 1.75 / .73 / .77 / .569 / reachable` |
| Center Right | straight | cross | `.311 / (1.69,1.91) / .55 / 1.75 / .75 / .53 / .407 / reachable` |
| Center Right | cross | neutral | `.220 / (-1.62,2.07) / .96 / 1.75 / .75 / .50 / .405 / reachable` |
| Center Right | cross | cross | `.040 / (-1.29,.97) / 1.44 / 1.75 / .76 / .73 / .555 / reachable` |
| Center Right | cross | straight | `.310 / (-1.64,2.15) / .62 / 1.75 / .93 / .48 / .319 / reachable` |
| Rear Right | straight | neutral | `.220 / (1.80,2.54) / 1.03 / 1.75 / .73 / .41 / .401 / reachable` |
| Rear Right | straight | straight | `.040 / (1.73,2.15) / 1.68 / 1.50 / .67 / .48 / .436 / reachable` |
| Rear Right | straight | cross | `.310 / (1.84,2.77) / .81 / 1.75 / .73 / .36 / .395 / reachable` |
| Rear Right | cross | neutral | `.220 / (-1.83,2.77) / 1.14 / 1.75 / — / .36 / .150 / miss` |
| Rear Right | cross | cross | `.040 / (-1.83,2.77) / 1.89 / 1.75 / — / .36 / .150 / miss` |
| Rear Right | cross | straight | `.310 / (-1.83,2.77) / .79 / 1.75 / — / .36 / .150 / miss` |
| Front Middle | straight | neutral | `.220 / (1.44,.50) / .54 / 1.75 / .73 / .85 / .577 / reachable` |
| Front Middle | straight | straight | `.040 / (1.40,.26) / 1.14 / 1.75 / .46 / .90 / .709 / reachable` |
| Front Middle | straight | cross | `.310 / (1.57,1.20) / .29 / 1.75 / .75 / .68 / .551 / reachable` |
| Front Middle | cross | neutral | `.220 / (-1.07,.26) / .51 / 1.75 / .69 / .90 / .603 / reachable` |
| Front Middle | cross | cross | `.040 / (-1.07,.26) / 1.16 / 1.75 / .32 / .90 / .772 / reachable` |
| Front Middle | cross | straight | `.310 / (-1.22,.73) / .20 / 1.75 / .74 / .79 / .569 / reachable` |

### 0.20m initial response

| Position | Incoming | Read | Result |
| --- | --- | --- | --- |
| Center Right | straight | neutral | `.220 / (1.62,1.52) / .79 / 1.75 / .76 / .61 / .413 / reachable` |
| Center Right | straight | straight | `.040 / (1.49,.73) / 1.44 / 1.75 / .73 / .79 / .573 / reachable` |
| Center Right | straight | cross | `.311 / (1.69,1.91) / .55 / 1.75 / .75 / .53 / .407 / reachable` |
| Center Right | cross | neutral | `.220 / (-1.62,2.07) / .96 / 1.75 / .75 / .50 / .405 / reachable` |
| Center Right | cross | cross | `.040 / (-1.26,.89) / 1.52 / 1.75 / .74 / .75 / .564 / reachable` |
| Center Right | cross | straight | `.310 / (-1.66,2.23) / .61 / 1.75 / .93 / .47 / .316 / reachable` |
| Rear Right | straight | neutral | `.220 / (1.80,2.54) / 1.03 / 1.75 / .73 / .41 / .401 / reachable` |
| Rear Right | straight | straight | `.040 / (1.72,2.07) / 1.74 / 1.50 / .68 / .50 / .434 / reachable` |
| Rear Right | straight | cross | `.310 / (1.82,2.70) / .85 / 1.75 / .75 / .38 / .387 / reachable` |
| Rear Right | cross | neutral | `.220 / (-1.83,2.77) / 1.14 / 1.75 / — / .36 / .150 / miss` |
| Rear Right | cross | cross | `.040 / (-1.83,2.77) / 1.99 / 1.75 / .99 / .36 / .276 / reachable` |
| Rear Right | cross | straight | `.310 / (-1.83,2.77) / .77 / 1.75 / — / .36 / .150 / miss` |
| Front Middle | straight | neutral | `.220 / (1.44,.50) / .54 / 1.75 / .73 / .85 / .577 / reachable` |
| Front Middle | straight | straight | `.040 / (1.40,.26) / 1.14 / 1.75 / .46 / .90 / .709 / reachable` |
| Front Middle | straight | cross | `.310 / (1.51,.89) / .12 / 1.75 / .89 / .75 / .496 / reachable` |
| Front Middle | cross | neutral | `.220 / (-1.07,.26) / .51 / 1.75 / .69 / .90 / .603 / reachable` |
| Front Middle | cross | cross | `.040 / (-1.07,.26) / 1.15 / 1.75 / .33 / .90 / .770 / reachable` |
| Front Middle | cross | straight | `.310 / (-1.26,.89) / .15 / 1.75 / .74 / .75 / .563 / reachable` |

### 0.30m initial response

| Position | Incoming | Read | Result |
| --- | --- | --- | --- |
| Center Right | straight | neutral | `.220 / (1.62,1.52) / .79 / 1.75 / .76 / .61 / .413 / reachable` |
| Center Right | straight | straight | `.040 / (1.47,.65) / 1.51 / 1.75 / .73 / .81 / .577 / reachable` |
| Center Right | straight | cross | `.311 / (1.69,1.91) / .54 / 1.75 / .75 / .53 / .406 / reachable` |
| Center Right | cross | neutral | `.220 / (-1.62,2.07) / .96 / 1.75 / .75 / .50 / .405 / reachable` |
| Center Right | cross | cross | `.040 / (-1.24,.81) / 1.60 / 1.75 / .73 / .77 / .573 / reachable` |
| Center Right | cross | straight | `.310 / (-1.66,2.23) / .57 / 1.75 / .95 / .47 / .308 / reachable` |
| Rear Right | straight | neutral | `.220 / (1.80,2.54) / 1.03 / 1.75 / .73 / .41 / .401 / reachable` |
| Rear Right | straight | straight | `.040 / (1.70,1.99) / 1.80 / 1.50 / .69 / .51 / .430 / reachable` |
| Rear Right | straight | cross | `.310 / (1.82,2.70) / .90 / 1.75 / .72 / .38 / .400 / reachable` |
| Rear Right | cross | neutral | `.220 / (-1.83,2.77) / 1.14 / 1.75 / — / .36 / .150 / miss` |
| Rear Right | cross | cross | `.040 / (-1.83,2.77) / 2.09 / 1.75 / .94 / .36 / .302 / reachable` |
| Rear Right | cross | straight | `.310 / (-1.83,2.77) / .75 / 1.75 / — / .36 / .150 / miss` |
| Front Middle | straight | neutral | `.220 / (1.44,.50) / .54 / 1.75 / .73 / .85 / .577 / reachable` |
| Front Middle | straight | straight | `.040 / (1.40,.26) / 1.14 / 1.75 / .45 / .90 / .710 / reachable` |
| Front Middle | straight | cross | `.310 / (1.51,.89) / .02 / 1.75 / .94 / .75 / .472 / reachable` |
| Front Middle | cross | neutral | `.220 / (-1.07,.26) / .51 / 1.75 / .69 / .90 / .603 / reachable` |
| Front Middle | cross | cross | `.040 / (-1.07,.26) / 1.14 / 1.75 / .33 / .90 / .767 / reachable` |
| Front Middle | cross | straight | `.310 / (-1.31,1.05) / .10 / 1.75 / .75 / .72 / .554 / reachable` |

The listed movement budget already includes the initial directional projection. The separate projection for exact Center Right straight reads is .094/.188/.280m. “Contact distance” is the shuttle-to-start-position distance; racket reach is listed separately. At unreachable rows, stretch is undefined and q=.15 is the engine helper's miss fallback.

## Drop tradeoff

At Center Right, the incoming tight drop gives the same result for all three smash-read impulse candidates because the shot is a mismatch and its separate .15m mismatch response is held constant:

| Anticipation | Reaction | Contact stretch | Height | q | Reach |
| --- | ---: | ---: | ---: | ---: | --- |
| Neutral | .220s | .66 | .76m | .573 | yes |
| Straight smash read | .277s | .69 | .67m | .556 | yes |
| Cross smash read | .277s | .69 | .67m | .556 | yes |

Smash-read commitment costs about .017 q against this drop, but does not make it undefendable. Increasing exact/wrong smash response does not amplify the drop penalty.

## Wide cross-smash threshold

Attacker `(1,5,2.6)`, receiver Rear Right `(1.3,4.8)`, cross target. Selected point is about `(-1.82,2.77)` in every row; required distance is 3.72m and racket extension 1.75m.

| Response | Read | Reaction | Movement budget | Stretch | q | Result |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| .10m | Neutral | .220s | 1.17m | — | .150 | miss |
| .10m | Cross | .040s | 1.92m | — | .150 | miss |
| .10m | Straight | .310s | .82m | — | .150 | miss |
| .20m | Neutral | .220s | 1.17m | — | .150 | miss |
| .20m | Cross | .040s | 2.02m | .97 | .285 | very stretched touch |
| .20m | Straight | .310s | .80m | — | .150 | miss |
| .30m | Neutral | .220s | 1.17m | — | .150 | miss |
| .30m | Cross | .040s | 2.12m | .91 | .311 | very stretched touch |
| .30m | Straight | .310s | .78m | — | .150 | miss |

This is a genuine sampler threshold: .10m remains just short, while .20m gains roughly .10m effective movement and crosses the reach boundary. It is a miss-to-touch transition, not a jump to a good return. At .30m the touch remains highly stretched and q only rises .026 from .20m.

## What the production rally resolver does after contact

The prototype itself does not execute `controller.js`; it computes candidate interception geometry and quality. The production continuation path was traced:

1. If `reach.canReach` is false, `cpuReturn` awards the point to the CPU for beating the player's positioning.
2. If reachable, the controller moves the player to `reach.feet`, stores `reach.quality` and `reach.point` in `incoming`, and lets the player choose a stroke.
3. `humanShot` passes that quality into production `errorRoll`/`faultChances`, then into `shotTarget`. If the return is not faulted, production evaluates the opponent's interception with `qualityAt`; an unreachable opponent loses the point, otherwise `cpuReturn` continues the rally.

For an illustrative identical **Straight Clear** chosen after the Center Right correct-read interception, production `faultChances` and `shotTarget` produce:

| Initial response | Incoming q | Straight-clear net+out risk | Clear target depth/strength | Opponent `qualityAt` from Center Right |
| ---: | ---: | ---: | --- | --- |
| 0m reaction-only | .564 | 4.47% | 4.43m / reduced | reachable, q=.835 |
| .10m | .569 | 4.41% | 4.45m / reduced | reachable, q=.832 |
| .20m | .573 | 4.36% | 4.47m / reduced | reachable, q=.829 |
| .30m | .577 | 4.32% | 4.49m / reduced | reachable, q=.827 |

So each reachable contact continues the rally if that clear avoids its stochastic fault roll; the opponent can reach this example return, so it is not an immediate winner. Lower-quality contacts also shorten the clear and increase fault risk through the real game functions. A miss ends the rally. The higher impulse changes this illustrative clear only slightly.

This is a trace through actual production resolver functions, not an end-to-end rally test: the production controller is closure-based, animation/DOM-coupled, CPU shot selection and fault rolls use randomness, and `qualityAt` still uses the current production smash trajectory rather than Candidate A. A deterministic integration test would need an injectable seeded RNG and a controller-level harness, then run the same fixtures from reception through selected return, opponent interception and point/continuation. That integration belongs after the prototype/model decision; it was not added because production was explicitly frozen.

## Decision gate

### A–M answers

* **A. Meaningful, non-overpowered value?** .10m is the conservative choice if retaining an initial directional response. Correct-read benefit at Center Right is already large at .10m, while .20/.30 add little. Reaction-only control shows the reaction reduction is the main source of that benefit.
* **B. Is .30m too strong?** It is not overpowering in Center Right, but it is unnecessary there and changes the wide fixture from miss to a slightly better poor touch. It is the least attractive value.
* **C. Is .10m too weak?** Not for Center Right; the correct-vs-neutral quality gap is .15–.16 and the physical point shifts. It still cannot reach the wide cross smash.
* **D. Is .20m a useful middle ground?** It is a numeric middle, but offers little benefit over .10m and crosses the wide-smash reach threshold.
* **E. Does correct read change physical position?** Yes. For Center Right straight, .10m shifts selected contact from neutral `(1.62,1.52)` to `(1.50,.81)`, with +.57m movement budget and lower stretch.
* **F. Is wrong anticipation worse?** Usually, especially for cross; rear-right straight estimates are close to neutral. It remains reachable for some fixtures and misses others.
* **G. Is neutral viable?** Yes. Center Right can return both smash directions at moderate/late estimated contact; bad coverage of a wide cross remains a miss.
* **H. Is there a drop tradeoff?** Yes, held constant across sweep: q falls .573 to .556 with smash anticipation.
* **I. Can a wide smash beat a correct read?** Yes at .10m it remains unreachable. At .20/.30 it becomes a very stretched, low-quality touch, not a strong defense.
* **J. Is bad recovery punishable?** Yes. The correctly read Rear Right cross attack only becomes a poor touch at larger impulse; neutral/wrong miss in the standard fixture, and the wider source remains more demanding.
* **K. Actual rally outcome?** Miss loses the point. Reachable contact continues to shot selection; fault risk, target depth and opponent interception are driven by production functions. The illustrative straight clear continues the rally but is reachable by the opponent. Full randomized controller outcomes need the integration harness described above.
* **L. Sampler nonlinearity?** Yes: wide fixture .10m misses, .20m becomes a q=.285 touch, .30m q=.311. Center Right remains smooth with no sudden good-contact jump.
* **M. Candidate toward production?** Tentatively .10m, only if an initial response is still desired. Reaction-only is already effective, so no production change is warranted based on this sweep alone.

### Recommendation

If carrying a candidate forward for a deterministic integration/playtest, use **0.10m exact/wrong predicted-direction impulse over .16s**, with the current reaction values unchanged: neutral `.22s`, correct `.04s`, wrong about `.31s`, smash-read-vs-drop `.277s` in this fixture. It preserves a correct-read advantage, keeps the wide smash unreachable, and avoids the .20m reach threshold. Evidence: Center Right correct q=.569 vs neutral .413; wrong cross-read q=.319; the reaction-only control already gives q=.564; and .20/.30 add only .004/.008 q over .10 on the straight fixture. This is a recommendation for the next prototype/integration step, **not authorization to implement**.

## Verification

* `node --test tests/smash-defense-prototype.test.js`: 8 passed.
* `npm test`: run after final report edits (see current task result).
* `git diff --check`: run after final report edits (see current task result).
