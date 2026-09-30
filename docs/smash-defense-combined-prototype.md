# Smash Defense: Combined Prototype Report

**Decision: do not implement this candidate in production yet.** The test-only combined model confirms that a mid-court target fixes the current landing-zone problem and that readiness can affect defense through reaction time and the existing movement/reach/stretch path. However, the candidate trajectory descends too sharply late in flight, the central defender only gains a small quality improvement from the correct read, and candidate coefficients are illustrative rather than calibrated. This prototype is a useful diagnostic, not a passing gameplay design.

No production gameplay or UI files were changed for this investigation. The prototype is in `tests/smash-defense-prototype.js` with deterministic checks in `tests/smash-defense-prototype.test.js`.

## Current production model

The relevant production path is `canSmash`/interception in `src/engine/interception.js`, followed by `shotTarget` in `src/engine/shots.js`, flight and trajectory helpers in `src/engine/shuttle.js`, and reaction/movement/contact in interception evaluation.

* **Eligibility:** a smash can follow a clear interception when contact is high, contact quality clears the configured minimum, and the player is not excessively stretched. Anticipation is not an eligibility requirement.
* **Direction/target x:** `destination()` places the shot at x = ±1.85; the sign depends on attacker side and `cross`.
* **Power:** `smashPower(quality, contactHeight)` supplies power; the target stores contact height. For this fixture (quality .92, contact 2.6m), power is about .770.
* **Depth:** production currently uses `0.45 + (1 - power) * 0.45`, so this fixture lands at about **0.553m from the net**, inside the front-court drop band (tight/normal/loose drop targets are 0.62/1.15/1.75m).
* **Flight:** `length = hypot(target.x - from.x, target.d + from.d)`. Smash speed is `11 + 9*power`; flight is `clamp(length/speed + .08, .32, .8)`. The candidate mid-court fixture produces 0.524s straight and 0.537s cross.
* **Horizontal path:** x and court depth are linear in normalized time t. Horizontal speed is therefore constant at path length / flight time.
* **Vertical path:** `h(t)=H(1-t)+.35t-.96t(1-t)`. It starts at contact height H, ends at .35m and descends monotonically for the tested H=2.6m. Production does not expose a separate calculated trajectory angle; angle can be inferred from horizontal and vertical velocities.
* **Interception:** the production engine samples the path, filters by net crossing and playable shuttle height, then checks player-to-shuttle distance against movement accumulated after reaction plus racket reach. Racket reach starts at .65m, with front/side/back lunge adjustments. Movement speed is 3.65m/s. Contact quality depends on timing, stretch and low contact; it is not a direct anticipation bonus.
* **Existing anticipation:** six recovery choices are independent from anticipation. Existing anticipation options are neutral and directional lean combinations. `leanDelay` gives neutral .22s; a directional lean uses alignment with the target and clamps delay to .09–.39s. It changes movement start timing, not recovery coordinates.
* **UI availability:** current anticipation controls display the generic options and do not forecast whether the CPU's chosen shot will be a smash. A future UI should offer smash reads only when the predicted CPU interception satisfies the existing `canSmash` rule for the selected user shot; this was not implemented here.

## Combined candidates tested

### Target depth

Three mappings were inspected: unchanged production (`current`), the existing clear minimum depth (2.45m, as a no-overlap lower bound), and a mid-court mapping `3.20 - .45*power`. The latter was used for the combined matrix. At power .770 it lands at **2.853m**: deeper than all drop targets and shallower than the existing clear target (a high-quality clear is deeper still). This is a meaningful attacking depth and avoids disguising a smash as a drop.

The 2.45m lower bound was not used for the full matrix because it is an edge of the clear/depth classification, while the 3.20m court-centre anchor gives a clearer mid-court landing. Neither value is established balancing data.

### Trajectory

The candidate holds target, power and production flight-time formula fixed, changing only vertical shape to `h(t)=H+(.35-H)t²`. It has the same launch/landing heights and longer high portion of flight. It does **not** change total flight time.

For H=2.6m, candidate heights at t=.5/.85 are 2.038/0.974m; current heights are 1.235/0.658m. At t=.85, candidate vertical descent speed is about 7.3m/s for the 0.524s fixture, versus about 3.0m/s for the current curve. Thus the candidate delays descent and then becomes substantially steeper near contact. It does not pass the “reasonable trajectory” gate as currently formulated. A trajectory should be redesigned around a bounded descent profile before it is considered further.

### Readiness

The prototype keeps the same generic `leanDelay` and maps smash anticipation to the nearest existing directional lean toward the expected straight/cross target. It applies test-only reaction adjustments, with no direct quality bonus:

| Outcome | Delay adjustment after directional lean |
| --- | ---: |
| Expected smash direction | -0.05s, floor .04s |
| Opposite smash direction | +0.04s, floor .09s |
| Clear mismatch | +0.12s |
| Drop mismatch | +0.17s |
| All | cap .39s |

These values were chosen as prototype probes, not derived from telemetry. Readiness influences contact only through reaction, movement budget, reach and stretch. It never changes receiver coordinates or recovery zone.

## Combined results

Fixture: attacker at (0.5, 5.0), 2.6m contact, quality .92; right-side receiver positions listed below. The candidate uses the 2.853m target and candidate curve. “q” is the prototype's contact-quality estimate, not a rally-win probability. Interception samples choose a reachable contact on the modeled path; “reachable” means a return contact exists, not that the rally is won.

| Receiver | Incoming | Read | Flight | Reaction | Reach? | Contact time | Distance / movement / reach | Stretch | Height | q |
| --- | --- | --- | ---: | ---: | --- | ---: | --- | ---: | ---: | ---: |
| Center-right | Straight smash | Neutral | .524 | .220 | yes | .435 | 2.11 / .79 / 1.75m | .76 | 1.05m | .543 |
| Center-right | Straight smash | Straight | .524 | .040 | yes | .393 | 2.59 / 1.29 / 1.75m | .74 | 1.33m | .564 |
| Center-right | Straight smash | Cross | .524 | .345 | yes | .472 | 1.77 / .46 / 1.75m | .75 | .78m | .534 |
| Center-right | Cross smash | Neutral | .537 | .220 | yes | .483 | 2.27 / .96 / 1.75m | .75 | .78m | .535 |
| Center-right | Cross smash | Cross | .537 | .041 | yes | .419 | 2.67 / 1.38 / 1.75m | .74 | 1.23m | .560 |
| Center-right | Cross smash | Straight | .537 | .354 | yes | .510 | 2.21 / .57 / 1.75m | .94 | .57m | .308 |
| Rear-right | Straight smash | Neutral | .524 | .220 | yes | .503 | 2.31 / 1.03 / 1.75m | .73 | .53m | .401 |
| Rear-right | Straight smash | Straight | .524 | .040 | yes | .482 | 2.61 / 1.61 / 1.50m | .67 | .70m | .568 |
| Rear-right | Straight smash | Cross | .524 | .182 | yes | .493 | 2.46 / 1.14 / 1.75m | .76 | .61m | .392 |
| Front-middle | Straight smash | Neutral | .524 | .220 | yes | .383 | 2.20 / .59 / 1.75m | .92 | .40m | .315 |
| Front-middle | Straight smash | Straight | .524 | .090 | yes | .371 | 2.27 / 1.03 / 1.75m | .71 | .45m | .416 |
| Front-middle | Cross smash | Neutral | .537 | .220 | yes | .400 | 2.17 / .66 / 1.75m | .86 | .40m | .340 |
| Front-middle | Cross smash | Cross | .537 | .090 | yes | .387 | 2.21 / 1.09 / 1.75m | .65 | .45m | .446 |

The center-right correct-read gain is small (about .02–.03 quality) despite a 0.18s reaction reduction. The large changes mostly appear in bad matches or the less ideal front-middle fixture; quality remains mediocre because the remaining geometric stretch is high and the candidate drops rapidly into the low-contact zone. Rear-right straight defense benefits notably from correct readiness, but this fixture is favorably aligned with that straight path. A wide cross smash from a rear-right receiver remains unreachable even with the correct cross read in the wide-source fixture (attacker x=1,d=5).

### Smash/drop tradeoff and neutral

From center-right, a tight drop (0.62m) is reachable with neutral (.573 quality estimate). Straight-smash readiness against that drop adds .04s and lowers the prototype estimate to .535, so the anticipation tradeoff is present. It is not universal: at front-middle, geometry can make drop coverage remain good despite the mismatch. Neutral remains a middle-ground response, rather than a dominant guarantee.

### Current baseline comparison

With the production target (0.553m) and the existing trajectory/reaction model, the same center-right q=.92 fixture has only about .399s straight and .416s cross flight. At center-right the tested neutral and generic directional reads did not reach the sampled path in the baseline investigation; at front-middle, the production baseline did produce contacts, but quality was low (about .315 neutral straight, .416 with front-right lean). The prototype's deeper target and longer path raise flight to about .52–.54s and create return contacts from center-right. These gains are not attributable to anticipation alone because target depth and path length changed at the same time.

## Regression and test status

The deterministic prototype checks cover target separation from drop/clear, trajectory endpoints and late descent, correct-versus-neutral/wrong readiness, center/rear/less-ideal positions, a wide correctly-read smash, drop mismatch, recovery-coordinate immutability, and mirrored left/right results. Existing production tests continue to cover eligibility, smash direction/power, recovery positions, clear/drop, normal anticipation, contact quality and racket/reach behavior.

`node --test tests/smash-defense-prototype.test.js`: 6 passed. `npm test`: 35 passed. `git diff --check`: passed. These are model tests, not playtest validation.

## Decision gate answers

| Question | Finding |
| --- | --- |
| A. Mid-court attacking landing? | **Yes** for the 2.853m candidate; current production is drop-depth and fails this. |
| B. Reasonable trajectory? | **No, not yet.** Candidate holds high then descends too sharply near contact. |
| C. Reasonable defensive window? | **Partial.** Candidate flights .524–.537s are defendable from some positions, but low-contact geometry and stretch still dominate. |
| D. Correct anticipation meaningfully improves defense? | **Not consistently.** It helps rear-right and some less-ideal fixtures; center-right improvement is small. |
| E. Wrong anticipation worse but sometimes defendable? | **Yes.** It is a gradient; wrong reads can remain reachable, and a wide correctly-read shot can still miss. |
| F. Neutral balanced? | **Mostly.** It has intermediate readiness and remains viable, but matrix outcomes vary substantially with position. |
| G. Smash readiness trades against drops? | **Yes in the center-right fixture**, through reaction/stretch. More fixtures are needed to establish useful consistency. |
| H. No relocation? | **Yes.** Receiver/recovery coordinates are unchanged. |
| I. Correct read not a guarantee? | **Yes.** The wide cross remains unreachable. |
| J. Bad position still punishable? | **Yes.** The rear-wide correctly-read case remains unreachable, although some poor positions improve. |
| K. Believable rally interaction? | **Not proven.** Candidate behavior is coherent in some fixtures but quality gains are uneven and trajectory is too steep late. |
| L. Both mechanics necessary? | **The model indicates both have distinct roles**, but this candidate does not establish final values. The deeper target/flight changes alone account for much of the center defense improvement; anticipation needs better-calibrated impact. |

## Recommendation

Keep the production smash system unchanged for now. The strongest finding is that production target depth is the primary role-separation defect: a smash should not land inside the drop band. Next prototype a mid-court smash target plus a vertical curve with controlled terminal descent, then evaluate the same full position/read matrix. Only tune readiness after trajectory sampling shows a consistent, plausible interception window. Preserve the current separation between recovery coordinates and anticipation, and offer smash-specific reads only when a forecast attacker interception passes the existing eligibility rule.
