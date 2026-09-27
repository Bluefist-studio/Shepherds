export const PLAY_TUNING = {
  // Edit this block first when tuning how the field feels.
  flockAttraction: 0.58, // Pull toward nearby sheep while the group is cohesive.
  cohesionRadius: 205, // Maximum distance at which sheep can pull back toward one another.
  alignmentRadius: 85, // Maximum distance for detecting nearby sheep movement.
  alignmentStrength: 0.95, // How strongly a sheep follows the local flock direction.
  separationStrength: 2.05, // Push sheep apart when they get too close.
  presenceRange: 130, // Distance at which dog pressure falls to zero.
  socialAvoidance: 1.3, // Extra separation for orange/red sheep from orange/red sheep.
  grazingStrength: 0.10, // Low-level wandering that keeps calm sheep alive and moving.
  waterAttractionRadius: 220, // Distance at which water begins pulling sheep toward its edge.
  waterAttractionStrength: .5, // Pull toward the water edge while calm.
  waterRepulsionStrength: 3.4, // Strong resistance when sheep get too close to the water center.
  waterEntryPaddingRatio: 0.18, // Extra water-entry buffer as a fraction of the pond radius.
  waterEdgeBuffer: 70, // Distance outside the water where edge resistance begins.
  waterEdgeSlowdown: 0.12, // Calm sheep retain only this movement fraction at the water edge.
  waterPressureSlowdown: 0.5, // Pressured sheep are still slowed while entering water.
  bushRepulsionStrength: 3, // Strong repulsion from bushes when sheep are not being pressured.
  bushSlowdown: 0.52, // Maximum slowdown from being in or near a bush.
  nervousnessGain: 5, // Nervousness gained per second at maximum immediate pressure.
  nervousnessPressureExponent: 5, // Makes nervousness rise disproportionately near the dog.
  pressureRiseRate: 8, // How quickly sheep feel newly applied dog pressure.
  pressureDecayRate: 0.6, // How slowly pressure fades after the dog backs away.
  pressureSpreadRadius: 150, // Distance at which sheep can feel a neighbor's pressure.
  pressureSpreadPercent: 0.12, // Maximum fraction of a neighbor's pressure passed on.
  nervousnessRecovery: 0.18, // How quickly nervousness fades without pressure.
  regroupNervousness: 0.08, // Sheep must calm below this level before regrouping begins.
  regroupRamp: 0.18, // Nervousness range over which regrouping attraction returns gradually.
  nervousnessMovementMultiplier: 0.82, // Extra movement speed and flight from nervousness.
  nervousThreshold: 0.75, // Nervousness level at which a sheep is considered nervous.
  breakawayThreshold: 0.75, // Nervousness level where sheep begin breaking away.
  breakawayFlockAttraction: 0.16, // Remaining local cohesion at maximum nervousness.
  breakawayFlightMultiplier: 1.6, // Extra dog-flight force for a breaking-away sheep.
  breakawayScatterStrength: 0.72, // Individual wandering force applied during a breakaway.
  edgeBounce: 0.28, // Fraction of velocity reflected when a sheep touches the world edge.
  edgeBufferDistance: 140, // Distance from a world edge where sheep begin steering inward.
  edgeBufferStrength: 2.8, // Inward steering force near world edges.
  obstacleBufferDistance: 30, // Small steering buffer around fences and rocks.
  lambMotherRadius: 320, // Distance at which lambs look for a blue mother.
  lambMotherAttraction: 1.6, // Moderate pull that keeps a lamb linked to its blue mother.
  motherFlockAttraction: 1.8, // Legacy tuning value; mothers now use normal green-sheep cohesion.
  familyNervousnessRadius: 220, // Distance at which a lamb and mother share nervousness.
  familyNervousnessShare: 1.2, // How quickly nearby lamb/mother nervousness is shared.
  familyTetherRadius: 240, // Distance at which mothers and lambs pull toward each other.
  familyTetherStrength: 0.85, // Gentle symmetric lamb/mother attraction strength.
  familySeparationMultiplier: 0.35, // Reduced spacing force between a lamb and its mother.
  familyGroupRadius: 360, // Distance at which blue mothers and lambs join one family cluster.
  familyGroupAttraction: 1.8, // Pull that keeps all family sheep together.
  separatorRadius: 380, // Distance at which orange/red sheep influence nearby green sheep.
  separatorStrength: 0.9, // How strongly orange/red sheep move away from the main flock.
  separatorAttraction: 1.5, // Pull that brings green sheep toward nervous separators.
  separatorNervousMultiplier: 7, // Strong nonlinear pull when orange/red separators are nervous.
  separatorBreakawayThreshold: 0.75, // Orange/red sheep begin separating at 50% nervousness.
  separatorNervousnessRadius: 220, // Distance at which nervous separators affect green nervousness.
  separatorNervousnessShare: 4, // Nervousness gained per second from a nervous separator.
  separatorNervousnessDistanceExponent: 2, // Makes the nearby nervousness effect stronger at close range.
  nervousPulseSize: 4, // Maximum nervous sheep pulse expansion in world units.
  nervousPulseSpeed: 7, // Nervous sheep pulse animation speed.
  nervousVisualColor: '#f77c62', // Shared warning color blended in as nervousness rises.
  pressureDirectionBias: 1.4, // Minimum outward force retained while the dog applies pressure.
  pressureMemoryStrength: 1.25, // Force that keeps sheep moving away after pressure ends.
  pressureMemoryDecay: 0.8, // Seconds-scale decay of the remembered escape direction.
  turnInertia: 0.22, // How much current movement resists sudden direction changes.
  gateFollowRadius: 300, // Distance at which sheep notice a neighbor passing through a gate.
  gateFollowStrength: 1.15, // Pull toward a discovered gate and its crossing direction.
  gateFollowDistance: 130, // Distance beyond the gate used as the one-way follow target.
  gateSignalDuration: 4, // Seconds a gate discovery remains useful to nearby sheep.
  barkNervousnessGain: 0.12, // Instant nervousness added to sheep caught in a bark.
  barkStrength: 3.2, // Directional force added to sheep inside the bark radius.
  barkImpulse: 35, // One-frame outward velocity burst from barking.
  barkImpulseDecay: 4.5, // How quickly the bark push fades after the bark.
};

export function createSheepComposition(counts) {
  return Object.entries(counts).flatMap(([type, count]) => Array(count).fill(type));
}

export const CONFIG = {
  world: {
    width: 3600, // Width of the playable world in world units.
    height: 2200 // Height of the playable world in world units.
  },
  dog: {
    radius: 18, // Dog collision radius.
    walkSpeed: 105, // Speed while holding C.
    jogSpeed: 205, // Default movement speed.
    sprintSpeed: 340, // Speed while holding Shift.
    turnSpeed: 10.5, // Angular turn rate in radians per second.
    acceleration: 900, // How quickly the dog reaches a target speed.
    deceleration: 1150, // How quickly the dog stops after releasing movement.
    maxStamina: 100, // Maximum stamina pool.
    sprintStaminaDrain: 22, // Stamina spent per second while sprinting.
    staminaRecoveryRate: 13, // Stamina recovered per second when not sprinting.
    presenceRange: PLAY_TUNING.presenceRange, // Matches the visible dog-pressure circle.
    barkStrength: PLAY_TUNING.barkStrength, // Extra outward pressure from a bark.
    barkImpulse: PLAY_TUNING.barkImpulse, // Immediate outward velocity from a bark.
    barkImpulseDecay: PLAY_TUNING.barkImpulseDecay, // Bark push fade rate.
    barkRange: 160, // Distance at which a bark can affect sheep.
    barkStaminaCost: 10, // Stamina spent each time Space triggers a bark.
    waterSlowdown: 0.15 // Maximum dog speed reduction while in water.
  },
  sheep: {
    radius: 15, // Sheep collision radius.
    grazingSpeed: 28, // Maximum movement speed while calm and grazing.
    maxSpeed: 102, // Base sheep movement speed when responding to pressure.
    mass: 1, // Base mass used when sheep push against one another.
    flockAttraction: PLAY_TUNING.flockAttraction, // Local cohesion force.
    cohesionRadius: PLAY_TUNING.cohesionRadius, // Nearby-neighbor range for cohesion.
    alignmentRadius: PLAY_TUNING.alignmentRadius, // Nearby-neighbor range for movement alignment.
    alignmentStrength: PLAY_TUNING.alignmentStrength, // Movement-following steering force.
    separationStrength: PLAY_TUNING.separationStrength, // Physical spacing force.
    socialAvoidance: PLAY_TUNING.socialAvoidance, // Orange/red social spacing force.
    grazingStrength: PLAY_TUNING.grazingStrength, // Calm wandering force.
    waterAttractionRadius: PLAY_TUNING.waterAttractionRadius, // Water edge attraction radius.
    waterAttractionStrength: PLAY_TUNING.waterAttractionStrength, // Water attraction force.
    waterRepulsionStrength: PLAY_TUNING.waterRepulsionStrength, // Water-center repulsion force.
    waterEntryPaddingRatio: PLAY_TUNING.waterEntryPaddingRatio, // Scaled water-entry buffer.
    waterEdgeBuffer: PLAY_TUNING.waterEdgeBuffer, // Water edge resistance distance.
    waterEdgeSlowdown: PLAY_TUNING.waterEdgeSlowdown, // Calm water-edge movement multiplier.
    waterPressureSlowdown: PLAY_TUNING.waterPressureSlowdown, // Pressured water movement multiplier.
    bushRepulsionStrength: PLAY_TUNING.bushRepulsionStrength, // Bush repulsion force.
    bushSlowdown: PLAY_TUNING.bushSlowdown, // Bush slowdown multiplier.
    obstacleStrength: 2.4, // Steering force away from nearby obstacles.
    nervousnessGain: PLAY_TUNING.nervousnessGain, // Pressure-to-nervousness rate.
    nervousnessPressureExponent: PLAY_TUNING.nervousnessPressureExponent, // Close-pressure nervousness curve.
    nervousThreshold: PLAY_TUNING.nervousThreshold, // Nervousness state threshold.
    pressureRiseRate: PLAY_TUNING.pressureRiseRate, // Pressure response rate while the dog is close.
    pressureDecayRate: PLAY_TUNING.pressureDecayRate, // Pressure recovery rate after the dog moves away.
    pressureSpreadRadius: PLAY_TUNING.pressureSpreadRadius, // Neighbor range for pressure spread.
    pressureSpreadPercent: PLAY_TUNING.pressureSpreadPercent, // Neighbor pressure fraction.
    nervousnessRecovery: PLAY_TUNING.nervousnessRecovery, // Calm-down rate.
    regroupNervousness: PLAY_TUNING.regroupNervousness, // Calmness required before regrouping.
    regroupRamp: PLAY_TUNING.regroupRamp, // Smoothness of regrouping activation.
    nervousnessMovementMultiplier: PLAY_TUNING.nervousnessMovementMultiplier, // Nervous speed/flight effect.
    nervousVisualColor: PLAY_TUNING.nervousVisualColor, // Color blended in according to nervousness.
    barkNervousnessGain: PLAY_TUNING.barkNervousnessGain, // Bark nervousness burst.
    breakawayThreshold: PLAY_TUNING.breakawayThreshold, // Nervousness needed to break away.
    breakawayFlockAttraction: PLAY_TUNING.breakawayFlockAttraction, // Cohesion remaining while fully nervous.
    breakawayFlightMultiplier: PLAY_TUNING.breakawayFlightMultiplier, // Flight boost while breaking away.
    breakawayScatterStrength: PLAY_TUNING.breakawayScatterStrength, // Directional scatter while breaking away.
    edgeBounce: PLAY_TUNING.edgeBounce, // Light sheep bounce at world boundaries.
    edgeBufferDistance: PLAY_TUNING.edgeBufferDistance, // Soft inner boundary distance.
    edgeBufferStrength: PLAY_TUNING.edgeBufferStrength, // Soft inner boundary force.
    obstacleBufferDistance: PLAY_TUNING.obstacleBufferDistance, // Fence/rock steering distance.
    lambMotherRadius: PLAY_TUNING.lambMotherRadius, // Lamb search radius for mothers.
    lambMotherAttraction: PLAY_TUNING.lambMotherAttraction, // Lamb-to-mother attraction.
    familyNervousnessRadius: PLAY_TUNING.familyNervousnessRadius, // Lamb/mother nervousness sharing range.
    familyNervousnessShare: PLAY_TUNING.familyNervousnessShare, // Lamb/mother nervousness sharing rate.
    familyTetherRadius: PLAY_TUNING.familyTetherRadius, // Lamb/mother tether range.
    familyTetherStrength: PLAY_TUNING.familyTetherStrength, // Symmetric lamb/mother attraction.
    familySeparationMultiplier: PLAY_TUNING.familySeparationMultiplier, // Family spacing reduction.
    familyGroupRadius: PLAY_TUNING.familyGroupRadius, // Family cluster range.
    familyGroupAttraction: PLAY_TUNING.familyGroupAttraction, // Family cluster cohesion.
    separatorRadius: PLAY_TUNING.separatorRadius, // Separator influence range.
    separatorStrength: PLAY_TUNING.separatorStrength, // Separator flock-escape force.
    separatorAttraction: PLAY_TUNING.separatorAttraction, // Compatible sheep pull toward separators.
    separatorNervousMultiplier: PLAY_TUNING.separatorNervousMultiplier, // Nervous separator force multiplier.
    separatorBreakawayThreshold: PLAY_TUNING.separatorBreakawayThreshold, // Nervousness needed for separator behavior.
    separatorNervousnessRadius: PLAY_TUNING.separatorNervousnessRadius, // Nervous separator range.
    separatorNervousnessShare: PLAY_TUNING.separatorNervousnessShare, // Nervous separator transfer rate.
    separatorNervousnessDistanceExponent: PLAY_TUNING.separatorNervousnessDistanceExponent, // Close-range transfer curve.
    nervousPulseSize: PLAY_TUNING.nervousPulseSize, // Nervous visual pulse size.
    nervousPulseSpeed: PLAY_TUNING.nervousPulseSpeed, // Nervous visual pulse speed.
    pressureDirectionBias: PLAY_TUNING.pressureDirectionBias, // Minimum dog-escape direction.
    pressureMemoryStrength: PLAY_TUNING.pressureMemoryStrength, // Continued escape force after release.
    pressureMemoryDecay: PLAY_TUNING.pressureMemoryDecay, // Escape-direction memory decay rate.
    turnInertia: PLAY_TUNING.turnInertia, // Direction-change smoothing.
    gateFollowRadius: PLAY_TUNING.gateFollowRadius, // Neighbor range for following gate discoveries.
    gateFollowStrength: PLAY_TUNING.gateFollowStrength, // Gate-following steering force.
    gateFollowDistance: PLAY_TUNING.gateFollowDistance, // One-way target distance beyond a gate.
    gateSignalDuration: PLAY_TUNING.gateSignalDuration, // Gate signal lifetime.
    pressureDistance: PLAY_TUNING.presenceRange // Same range used by the visible pressure circle.
  },
  camera: {
    lookRadius: 230, // Maximum camera look-ahead from the dog.
    smoothing: 5, // Camera follow responsiveness.
    mouseSensitivity: 1 // Multiplier for mouse look-ahead distance.
  },
  debug: {
    showPresence: true, // Draw the dog's pressure radius.
    showDesired: false // Draw each sheep's desired movement vector when enabled.
  }
};

export const SHEEP_TYPES = {
  green: { color: '#a9d86e', accent: '#d8ef72', nervousnessGain: 1, speed: 1, social: 1 },
    yellow: { color: '#f1c75b', nervousColor: '#fff0a5', accent: '#fff0a5', nervousnessGain: 2.5, speed: 1.2, social: 1 },
  lightBlue: { color: '#9edcf2', accent: '#d9f5ff', nervousnessGain: 2, speed: 0.78, social: 1, lamb: true, family: true },
  blue: { color: '#3d82c4', accent: '#9ecbff', nervousnessGain: 1, speed: 1.05, social: 1, mother: true, family: true, massMultiplier: 2.5, motherFlock: true },
  // Separators leave the main flock and can pull compatible sheep with them.
  // Orange and red still retain their independent avoidance of one another.
    orange: { color: '#ef9657', nervousColor: '#ffd08a', accent: '#ffd0a1', nervousnessGain: 2.5, speed: 1.1, social: 1, independent: true, separator: true },
    red: { color: '#e96561', nervousColor: '#ffaaa0', accent: '#ffb3a1', nervousnessGain: 5, speed: 1.15, social: 1, independent: true, separator: true }
};
