import { clamp } from './math.js';
import { SMASH_TUNING } from './constants.js';

/** Return whether this interception supports an overhead smash. */
function canSmash(interception, incomingShotType) {
  return (
    incomingShotType === 'clear' &&
    interception?.canReach === true &&
    interception.quality >= SMASH_TUNING.minimumQuality &&
    interception.height >= SMASH_TUNING.minimumHeight &&
    interception.stretch <= SMASH_TUNING.maximumStretch
  );
}

/** Convert contact quality and height into a normalized smash power. */
function smashPower(quality, height) {
  const qualityFactor = clamp(
    (quality - SMASH_TUNING.minimumQuality) / (1 - SMASH_TUNING.minimumQuality),
    0,
    1,
  );
  const heightFactor = clamp(
    (height - SMASH_TUNING.minimumHeight) /
      (SMASH_TUNING.fullPowerHeight - SMASH_TUNING.minimumHeight),
    0,
    1,
  );
  return (
    SMASH_TUNING.minimumPower +
    (1 - SMASH_TUNING.minimumPower) * (0.65 * qualityFactor + 0.35 * heightFactor)
  );
}

export { canSmash, smashPower };
