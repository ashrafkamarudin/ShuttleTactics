# Smash Readiness: Rally-Flow Validation

**Decision: do not implement yet.** A test-only rally harness now carries the candidate smash reception through shot faults, target generation, recovery movement, opponent interception, and subsequent deterministic clear exchanges. The 0.10m candidate creates a measurable effect at Center Right: correct reads raise reception quality from about .41 to .55–.57, lower the fixed-clear fault risk from about 6.6–6.7% to about 4.4–4.6%, and modestly improve outcomes in the 100 seeded runs. Rear-right straight defense improves less. The wide correctly-read smash still wins immediately.

The controller is closure-based and tied to DOM/animation, so the harness mirrors its turn-resolution sequence rather than importing `controller.js`. It uses production functions for eligibility, fault rates, shot targets, recovery delay, movement speed, flight time, and all clear interceptions after the first candidate smash. The first smash interception itself uses the frozen Candidate A prototype because production does not yet contain that candidate. Shot choices are fixed (CPU smash as specified by each scenario; human and CPU use straight clear afterward); fault rolls use a seeded RNG and the actual production fault probabilities. This is a deterministic integration harness, not a test of the rendered UI or animation.

Only `tests/smash-rally-harness.js`, its test, and prototype helper/tests changed. Production gameplay, UI, recovery and shot code remain untouched.

## Frozen setup

* Target depth: `3.20 - .45*power`; the representative power .7701 lands at 2.853455m.
* Target x: straight +1.85m; cross -1.85m.
* Flight-time formula, horizontal progression and Candidate A vertical curve are unchanged.
* Correct smash anticipation: .04s reaction and .10m initial predicted-direction response over .16s. Wrong read: current predicted-direction reaction (about .31s) and .10m toward the wrong direction. Neutral: .22s and no initial response. Smash-read versus drop retains the .15m mismatch response and about .277s in the fixture.
* Recovery zones and coordinates are unchanged. The harness uses Center Right as its deterministic recovery choice during following strokes.
* CPU smash eligibility is checked with production `qualityAt` on a preceding clear and production `canSmash`: q=.7663, height=2.9255m, stretch=0. The representative smash is then deterministically selected from the requested straight/cross fixture.

## Harness behavior

For the first incoming smash, the test harness evaluates the exact Candidate A target/trajectory/interception geometry and stores the resulting quality and contact position as the controller does. A miss immediately awards the point to CPU. A reachable contact deterministically selects Straight Clear; the harness applies the production `faultChances` thresholds with a seeded random roll, generates the clear with production `shotTarget`, moves the hitter with production `recoveryDelay` and movement speed, and evaluates the receiver with production `qualityAt`. The receiver then returns another Straight Clear, alternating until a point ends or eight strokes have occurred. Reaching the eight-stroke limit is reported as a continuing rally, not a point.

Thus the harness exercises the mechanics that convert contact quality into fault risk, clear depth, opponent contact and points. It does not execute production `errorRoll` directly because that function reads global `Math.random`; the harness feeds its deterministic roll through the same pure production `faultChances` calculation. It also does not invoke the UI, renderer, animation `fly`, stochastic `aiChoose`, or actual controller callbacks.

## Scenario results

Each row is **100 seeded trials**, with the same seed sequence for each read. Contact bins use q `<.48` weak, `.48–<.76` medium, `>=.76` good. Point percentages after eight alternating clear strokes are outcomes of this controlled fixture, not player-skill probabilities.

| Scenario | Anticipation | Reception miss | Weak / medium / good | First return fault | Opponent intercepts first return | Player point | CPU point | Still rallying at stroke 8 |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| A: Center Right, straight smash | Neutral | 0% | 100 / 0 / 0% | 11% | 89% | 13% | 17% | 70% |
| A | Straight | 0% | 0 / 100 / 0% | 6% | 94% | 14% | 12% | 74% |
| A | Cross | 0% | 100 / 0 / 0% | 11% | 89% | 13% | 17% | 70% |
| B: Center Right, cross smash | Neutral | 0% | 100 / 0 / 0% | 11% | 89% | 13% | 17% | 70% |
| B | Cross | 0% | 0 / 100 / 0% | 6% | 94% | 14% | 12% | 74% |
| B | Straight | 0% | 100 / 0 / 0% | 12% | 88% | 13% | 17% | 70% |
| C: Rear Right, straight smash | Neutral | 0% | 100 / 0 / 0% | 11% | 89% | 13% | 17% | 70% |
| C | Straight | 0% | 100 / 0 / 0% | 10% | 90% | 13% | 16% | 71% |
| C | Cross | 0% | 100 / 0 / 0% | 11% | 89% | 13% | 17% | 70% |
| D: Rear Right, wide cross smash, attacker x=1 | Neutral | 100% | 0 / 0 / 0% | — | — | 0% | 100% | 0% |
| D | Cross | 100% | 0 / 0 / 0% | — | — | 0% | 100% | 0% |
| D | Straight | 100% | 0 / 0 / 0% | — | — | 0% | 100% | 0% |
| E: Center Right, straight drop | Neutral | 0% | 0 / 100 / 0% | 6% | 94% | 14% | 12% | 74% |
| E | Straight smash read | 0% | 0 / 100 / 0% | 6% | 94% | 14% | 12% | 74% |
| E | Cross smash read | 0% | 0 / 100 / 0% | 7% | 93% | 14% | 13% | 73% |

The 100-trial outcome differences are modest. Center-right correct reads reduce observed CPU point rate by five percentage points and improve first-return interception/fault rates; rear-right straight improves only slightly. Wrong reads look like neutral for Scenario A in this finite batch, while Scenario B has a worse contact and one additional first-return fault. The contact-quality/fault-rate gradient is clearer than the final point delta, which is affected by subsequent controlled rallies and the eight-stroke cap.

## Contact and return consequences

Representative seed 42, with the same fixed Straight Clear choice after contact:

| Scenario/read | Smash/drop reception q | Contact | Contact point | Stretch | First-return target | Straight-clear fault risk | Production opponent interception |
| --- | ---: | --- | --- | ---: | --- | ---: | --- |
| A neutral | .413 | weak | (1.621,1.518) | .755 | 3.65m, weak clear | 6.61% | reachable, q=.891 |
| A correct straight | .569 | medium | (1.499,.812) | .735 | 4.45m, reduced clear | 4.41% | reachable, q=.865 |
| A wrong cross | .407 | weak | (1.688,1.911) | .748 | 3.62m, weak clear | 6.70% | reachable, q=.891 |
| B neutral | .405 | weak | (-1.615,2.068) | .746 | 3.61m, weak clear | 6.74% | reachable, q=.891 |
| B correct cross | .555 | medium | (-1.286,.969) | .757 | 4.38m, reduced clear | 4.59% | reachable, q=.867 |
| B wrong straight | .319 | weak | (-1.639,2.147) | .930 | 3.16m, weak clear | 8.15% | reachable, q=.898 |
| C neutral | .401 | weak | (1.796,2.539) | .731 | 3.59m, weak clear | 6.80% | reachable, q=.891 |
| C correct straight | .436 | weak | (1.729,2.147) | .674 | 3.77m, weak clear | 6.26% | reachable, q=.889 |

Correct reads at Center Right cross the game's weak/medium contact threshold, improve clear depth by roughly .8m and reduce the sampled fault rate by about 2.1 percentage points. Neutral and wrong reads still continue the rally, with lower-quality/shorter clears and higher fault risk. At Rear Right, the contact remains weak even with the correct straight read, so anticipation does not erase recovery position.

For the tight-drop case, target remains .62m. Neutral q=.573 produces a reduced clear at 4.47m; straight-smash-read q=.556 produces 4.38m; cross-smash-read q=.532 produces a weak clear at 4.26m. All three intercept the drop, so the mismatch creates a real but moderate return-quality cost rather than an automatic miss.

## Wide-smash cross-check

The test-only Candidate A path reports the wide cross smash unreachable at .10m for all three reads (100/100 CPU points). Separately, production `qualityAt` was run against the same frozen 2.853m target using its currently shipped smash vertical curve and the expected directional lean. Its correct-read result is also unreachable. That production call does not include the proposed .04s smash-specific reaction or .10m impulse because those are not installed in production, but confirms the current movement/reach geometry agrees that the wide shot beats this receiver.

This is not contradicted by the earlier .20m/.30m sweep where the target was only technically reachable: the current integration candidate is .10m, the correct-read geometry remains stretched at the wide point, and the actual controller-path harness awards the point on miss.

## Architecture and UI availability

The production controls currently show generic directional `LEANS` unconditionally; they do not have separate straight-smash/cross-smash anticipation options. The state field `smashAvailable` is `canSmash(incoming, incoming.shotType)`, which enables the player's own attack mode after receiving a qualifying shot. It does not indicate whether the opponent could smash after the player's next stroke.

To gate future smash-read choices without revealing the CPU's selected shot, the UI would need to forecast whether the CPU's interception of the currently selected player shot satisfies the same `canSmash` rule. The controller already has all inputs during shot resolution, but the anticipation controls render before the next CPU stroke and currently have no such forecast value. This iteration made no UI change. A future implementation can expose only a boolean eligibility opportunity, not the CPU's exact selected shot.

Recovery and anticipation remained independent in the harness: scenario recovery coordinates are copied as the starting position and never replaced based on the read. The same recovery destination is used after strokes for every read.

## Shot-role and trajectory regression

The existing prototype tests still verify front-court drop targets (.62/1.15/1.75m), Candidate A smash depth 2.853455m and deep-clear target 5.90m. The integration fixture confirms straight/cross target x of ±1.85m. Candidate A remains continuously descending to .35m with a controlled terminal descent; no trajectory, target, power, speed or horizontal change was made.

## Decision gate answers

1. **Does correct anticipation change actual rally flow?** Yes in the deterministic harness: more Center Right returns reach medium quality, first-return faults drop, CPU first-return interceptions rise, and CPU point rate falls modestly.
2. **Is neutral useful?** Yes; it can return centered smashes but more often produces weak contact than the matching read.
3. **Is wrong read worse?** Yes for cross/read mismatch; for straight Scenario A it is close to neutral in this 100-seed batch. It does not force a loss.
4. **Is the effect reaction/readiness rather than a quality bonus?** Yes. The helper changes reaction and initial movement projection; quality is recomputed from movement, reach and stretch. Reaction-only earlier measured q=.564 versus .569 with .10m.
5. **Is .10m useful?** It preserves a small physical response; at Center Right most of the gameplay effect comes from the .04s versus .22s reaction difference.
6. **Can a well-positioned player defend a normal smash?** Yes, with neutral or correct read in these fixtures; the correct read more often reaches medium contact.
7. **Can wrong read sometimes defend?** Yes; all central smash mismatches remain reachable.
8. **Can a wide smash beat correct anticipation?** Yes; the wide cross ends the rally on a miss in the test harness and is also unreachable in production `qualityAt` with its current curve.
9. **Does poor recovery remain punishable?** Yes. Rear-right cross misses; rear-right straight remains weak even on the correct read.
10–12. **Shot roles:** Smash stays mid-court, drops front-court, clears deep.
13. **Drop tradeoff:** Yes, smash reads modestly reduce contact/return quality against drops; the defender still intercepts.
14. **Neutral balanced:** Yes; it stays viable without a directional commitment.
15–16. **Does quality survive into rally outcomes?** Partly. The game uses it in fault chances and clear depth. At Center Right, correct-read q changes weak clear to reduced clear and observed first-return fault rate from 11% to 6%; final points move less (CPU points 17% to 12%, continuing rallies 70% to 74%). So downstream effects exist, though the point delta is modest.
17. **Recovery independent?** Yes.
18. **Can reads be offered without revealing CPU shot?** Yes in principle, via a predicted `canSmash` eligibility flag; current UI/controller state does not expose that forecast yet.

## Recommendation and remaining gate

The candidate is **promising but not ready for production implementation**. A 100-trial controlled batch shows real downstream differences, not just interception quality, while keeping wide attacks and poor recovery dangerous. However, the actual controller was not invoked directly, CPU choice was fixed, and the point percentages reflect a deterministic straight-clear policy with an eight-stroke cap. Before production, add an injectable controller seam or browser-level deterministic harness around the real turn resolver, then rerun these same fixtures with varied CPU choices and longer rallies. No production changes are authorized by these test results.

Verification commands for this iteration:

* `node --test tests/smash-defense-prototype.test.js`
* `node --test tests/smash-rally-harness.test.js`
* `npm test`
* `git diff --check`

## Follow-up: narrow production-controller seam

The follow-up iteration added `src/game/rally-resolution.js` and routed the existing player and CPU rally turns through it for shot target/fault resolution, interception, and miss adjudication. The controller still owns AI choice, animation, and UI updates. The deterministic fixture now invokes the same resolver functions used by those controller paths; it continues to use the frozen Candidate A evaluator only for the first incoming smash, since that candidate is not production behavior.

All 15 original 100-seed scenario/read batches were rerun with the same seeds and fixture choices. Every recorded result is unchanged, including the contact-quality values and point outcome percentages above. The shared shot resolver uses the same target calculation, fault thresholds, and single random draw as the prior controller code. The shared interception wrapper calls the existing production `qualityAt`, and miss adjudication preserves the same point winner. The focused seam assertion and all 42 tests pass; `git diff --check` is clean.

This seam validates the deterministic turn-resolution logic used by the controller; it does not execute DOM rendering, animation timing, or randomized CPU shot selection. No gameplay parameters or user-facing behavior were changed.

## Production implementation plan

1. Promote the frozen Candidate A interception/readiness calculation into a production engine module without changing its calibrated target, trajectory, response distance, or reaction values.
2. Feed that evaluator the actual incoming trajectory, defender position, and chosen lean from the shared controller turn seam. Use one eligibility/readiness calculation for both CPU and player defense, with no anticipation requirement for smash eligibility.
3. Keep the existing production smash eligibility and power rules. When the CPU considers a smash, evaluate its predicted contact with the same reach, height, quality, and balance rules before making it an available choice; preserve current shot-selection weights until separate playtest evidence supports changes.
4. Have the controller consume the evaluator's contact result for reach/miss, quality, point outcome, and next-turn context. Keep animation and UI work separate from the physics change.
5. Promote the same A–E fixtures into production regression coverage, then add controller-level checks for CPU attack eligibility, player and CPU symmetry, correct/neutral/wrong reads, and a wide smash that remains unreachable. Re-run the frozen 100-seed batch and require exact parity before considering any subsequent tuning.

The seam validation passes the integration gate for proceeding to a narrowly scoped production implementation. It does not authorize or perform that gameplay implementation in this iteration.
