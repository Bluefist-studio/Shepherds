import { CONFIG, SHEEP_TYPES } from './config.js';
import { approach, circleRectResolve, clamp, distance, keepInWorldWithBounce, normalize } from './physics.js';

export class Sheep {
  constructor(x, y, type, index) { this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.type = type; this.index = index; this.radius = CONFIG.sheep.radius; this.mass = CONFIG.sheep.mass * (SHEEP_TYPES[type].massMultiplier || 1) * (type === 'red' ? 1.15 : 1); this.nervousness = 0.12; this.nervousnessSnapshot = 0.12; this.pressureLevel = 0; this.pressureSnapshot = 0; this.grazingPhase = index * 2.7; this.barkPush = { x: 0, y: 0 }; this.alignmentVelocity = { x: 0, y: 0 }; this.pressureDirection = { x: 0, y: 0 }; this.pressureMemory = 0; this.desired = { x: 0, y: 0 }; }
  update(flock, dog, obstacles, world, dt, barkActive) {
    const data = CONFIG.sheep; const archetype = SHEEP_TYPES[this.type];
    let forceX = 0; let forceY = 0;
    const breakawayAmount = clamp((this.nervousness - data.breakawayThreshold) / (1 - data.breakawayThreshold), 0, 1);
    const breakawayCohesion = 1 - breakawayAmount * (1 - data.breakawayFlockAttraction);
    const regroupCohesion = clamp((data.regroupNervousness - this.nervousness + data.regroupRamp) / data.regroupRamp, 0, 1);
    const cohesion = breakawayCohesion * regroupCohesion;
    let nearbyX = 0; let nearbyY = 0; let nearbyCount = 0; let alignmentX = 0; let alignmentY = 0; let alignmentCount = 0; let familyX = 0; let familyY = 0; let familyCount = 0;
    for (const other of flock.sheep) {
      if (other === this) continue;
      const dx = this.x - other.x; const dy = this.y - other.y; const d = Math.hypot(dx, dy) || 0.001;
      const minDistance = this.radius + other.radius;
      const otherArchetype = SHEEP_TYPES[other.type];
      const familyPair = archetype.family && otherArchetype.family && ((archetype.lamb && otherArchetype.mother && this.motherIndex === other.index) || (archetype.mother && otherArchetype.lamb && other.motherIndex === this.index));
      const compatibleForCohesion = (!SHEEP_TYPES[other.type].separator || archetype.separator) && (!archetype.independent || !SHEEP_TYPES[other.type].independent);
      if (compatibleForCohesion && d < data.cohesionRadius) { nearbyX += other.x; nearbyY += other.y; nearbyCount += 1; }
      if (compatibleForCohesion && d < data.alignmentRadius) { alignmentX += other.alignmentVelocity.x; alignmentY += other.alignmentVelocity.y; alignmentCount += 1; }
      if (d < minDistance * 2.3) {
        const away = normalize(dx, dy);
        const ratio = (minDistance * 2.3 - d) / (minDistance * 2.3);
        const strength = ratio * ratio;
        const separationMultiplier = familyPair ? data.familySeparationMultiplier : 1;
        forceX += away.x * strength * data.separationStrength * separationMultiplier;
        forceY += away.y * strength * data.separationStrength * separationMultiplier;
      }
      if (familyPair && d < data.familyTetherRadius) { const towardFamily = normalize(other.x - this.x, other.y - this.y); const tetherFalloff = 1 - d / data.familyTetherRadius; forceX += towardFamily.x * data.familyTetherStrength * tetherFalloff; forceY += towardFamily.y * data.familyTetherStrength * tetherFalloff; }
      if (archetype.independent && (other.type === 'orange' || other.type === 'red') && d < 105) { const away = normalize(dx, dy); const strength = (105 - d) / 105; forceX += away.x * strength * data.socialAvoidance; forceY += away.y * strength * data.socialAvoidance; }
    }
    if (nearbyCount > 0) { const toNearby = normalize(nearbyX / nearbyCount - this.x, nearbyY / nearbyCount - this.y); forceX += toNearby.x * data.flockAttraction * cohesion * archetype.social; forceY += toNearby.y * data.flockAttraction * cohesion * archetype.social; }
    if (familyCount > 0) { const toFamily = normalize(familyX / familyCount - this.x, familyY / familyCount - this.y); forceX += toFamily.x * data.familyGroupAttraction; forceY += toFamily.y * data.familyGroupAttraction; }
    if (archetype.separator && this.nervousness >= data.separatorBreakawayThreshold) {
      for (const other of flock.sheep) {
        if (other === this || SHEEP_TYPES[other.type].separator) continue;
        const separatorDistance = distance(this, other);
        if (separatorDistance < data.separatorRadius) {
          const towardSeparator = normalize(other.x - this.x, other.y - this.y);
          const separatorNervousness = clamp((other.nervousnessSnapshot - data.separatorBreakawayThreshold) / (1 - data.separatorBreakawayThreshold), 0, 1);
          const separatorBoost = separatorNervousness ** 2 * data.separatorNervousMultiplier;
          const separatorFalloff = 1 - separatorDistance / data.separatorRadius;
          forceX += towardSeparator.x * data.separatorAttraction * separatorFalloff * separatorBoost;
          forceY += towardSeparator.y * data.separatorAttraction * separatorFalloff * separatorBoost;
        }
      }
    }
    if (archetype.lamb && this.motherIndex !== null) {
      const mother = flock.sheep.find((other) => other.index === this.motherIndex);
      if (mother) { const motherDistance = distance(this, mother); if (motherDistance < data.lambMotherRadius) { const toMother = normalize(mother.x - this.x, mother.y - this.y); const motherFalloff = 1 - motherDistance / data.lambMotherRadius; forceX += toMother.x * data.lambMotherAttraction * motherFalloff; forceY += toMother.y * data.lambMotherAttraction * motherFalloff; } }
    }
    if (alignmentCount > 0) { const aligned = normalize(alignmentX / alignmentCount, alignmentY / alignmentCount); forceX += aligned.x * data.alignmentStrength * cohesion; forceY += aligned.y * data.alignmentStrength * cohesion; }
    for (const signal of flock.gateSignals) {
      const gateDistance = Math.hypot(signal.x - this.x, signal.y - this.y);
      if (gateDistance < data.gateFollowRadius) {
        const crossingDirection = normalize(signal.direction.x, signal.direction.y);
        const sideOfGate = (this.x - signal.x) * crossingDirection.x + (this.y - signal.y) * crossingDirection.y;
        if (sideOfGate >= 0) continue;
        const gateTargetX = signal.x + crossingDirection.x * data.gateFollowDistance;
        const gateTargetY = signal.y + crossingDirection.y * data.gateFollowDistance;
        const towardGateTarget = normalize(gateTargetX - this.x, gateTargetY - this.y);
        const followAmount = (1 - gateDistance / data.gateFollowRadius) * data.gateFollowStrength;
        forceX += (towardGateTarget.x + crossingDirection.x) * followAmount;
        forceY += (towardGateTarget.y + crossingDirection.y) * followAmount;
      }
    }
    const dogDistance = distance(this, dog); const directPressure = clamp(1 - dogDistance / data.pressureDistance, 0, 1);
    let neighborPressure = 0;
    for (const other of flock.sheep) {
      if (other === this) continue;
      const neighborDistance = distance(this, other);
      if (neighborDistance < data.pressureSpreadRadius) {
        const spreadFalloff = 1 - neighborDistance / data.pressureSpreadRadius;
        neighborPressure = Math.max(neighborPressure, other.pressureSnapshot * spreadFalloff * data.pressureSpreadPercent);
      }
    }
    const targetPressure = Math.max(directPressure, neighborPressure);
    const pressureRate = targetPressure > this.pressureLevel ? data.pressureRiseRate : data.pressureDecayRate;
    this.pressureLevel = approach(this.pressureLevel, targetPressure, pressureRate * dt);
    const pressure = this.pressureLevel;
    if (directPressure > 0) {
      const away = normalize(this.x - dog.x, this.y - dog.y);
      this.pressureDirection = away;
      this.pressureMemory = 1;
      const escapePressure = Math.max(pressure, directPressure);
      const flight = escapePressure * (1 + this.nervousness * data.nervousnessMovementMultiplier) * (1 + breakawayAmount * data.breakawayFlightMultiplier) / (archetype.massMultiplier || 1);
      forceX += away.x * flight * 2.2; forceY += away.y * flight * 2.2;
    }
    if (directPressure > 0) {
      const nervousnessPressure = directPressure ** data.nervousnessPressureExponent;
      this.nervousness = clamp(this.nervousness + nervousnessPressure * data.nervousnessGain * archetype.nervousnessGain * dt, 0, 1);
    } else {
      this.nervousness = clamp(this.nervousness - data.nervousnessRecovery * dt, 0, 1);
      this.pressureMemory = Math.max(0, this.pressureMemory - data.pressureMemoryDecay * dt);
    }
    if (archetype.family) {
      const linkedFamilyMember = archetype.lamb ? flock.sheep.find((other) => other.index === this.motherIndex) : flock.sheep.find((other) => other.type === 'lightBlue' && other.motherIndex === this.index);
      if (linkedFamilyMember) { const familyDistance = distance(this, linkedFamilyMember); if (familyDistance < data.familyNervousnessRadius) { const familyFalloff = 1 - familyDistance / data.familyNervousnessRadius; const sharedNervousness = linkedFamilyMember.nervousnessSnapshot * familyFalloff; this.nervousness = approach(this.nervousness, Math.max(this.nervousness, sharedNervousness), data.familyNervousnessShare * familyFalloff * dt); } }
    }
    if (!archetype.separator) {
      for (const other of flock.sheep) {
        if (!SHEEP_TYPES[other.type].separator || other.nervousnessSnapshot <= data.separatorBreakawayThreshold) continue;
        const separatorDistance = distance(this, other);
        if (separatorDistance < data.separatorNervousnessRadius) {
          const distanceFalloff = (1 - separatorDistance / data.separatorNervousnessRadius) ** data.separatorNervousnessDistanceExponent;
          const nervousExcess = (other.nervousnessSnapshot - data.separatorBreakawayThreshold) / (1 - data.separatorBreakawayThreshold);
          this.nervousness = clamp(this.nervousness + nervousExcess * distanceFalloff * data.separatorNervousnessShare * dt, 0, 1);
        }
      }
    }
    if (this.pressureMemory > 0) { forceX += this.pressureDirection.x * data.pressureMemoryStrength * this.pressureMemory; forceY += this.pressureDirection.y * data.pressureMemoryStrength * this.pressureMemory; }
    if (barkActive && dogDistance < dog.config.barkRange) {
      const away = normalize(this.x - dog.x, this.y - dog.y);
      const barkFalloff = clamp(1 - dogDistance / dog.config.barkRange, 0, 1);
      forceX += away.x * dog.config.barkStrength * barkFalloff;
      forceY += away.y * dog.config.barkStrength * barkFalloff;
      this.barkPush.x += away.x * dog.config.barkImpulse * barkFalloff / this.mass;
      this.barkPush.y += away.y * dog.config.barkImpulse * barkFalloff / this.mass;
      this.nervousness = clamp(this.nervousness + data.barkNervousnessGain * archetype.nervousnessGain, 0, 1);
    }
    if (breakawayAmount > 0) { forceX += Math.cos(this.grazingPhase * 1.7) * breakawayAmount * data.breakawayScatterStrength; forceY += Math.sin(this.grazingPhase * 1.43) * breakawayAmount * data.breakawayScatterStrength; }
    this.grazingPhase += dt * (0.5 + this.index * 0.013);
    forceX += Math.cos(this.grazingPhase) * data.grazingStrength; forceY += Math.sin(this.grazingPhase * 1.21) * data.grazingStrength;
    let bushSlowdown = 1;
    let waterSlowdown = 1;
    const pressureBias = Math.max(pressure, this.nervousness);
    for (const obstacle of obstacles) {
      if (obstacle.kind === 'water' && obstacle.radius) {
        const dx = this.x - obstacle.x; const dy = this.y - obstacle.y; const d = Math.hypot(dx, dy) || 0.0001;
        const waterPadding = obstacle.radius * data.waterEntryPaddingRatio;
        const waterRadius = obstacle.radius + this.radius + waterPadding;
        const attractionRadius = obstacle.radius + data.waterAttractionRadius;
        const pressuredToEnterWater = pressure > 0.35 || directPressure > 0.55 || barkActive;
        const waterEdgeRadius = waterRadius + data.waterEdgeBuffer;
        if (d < attractionRadius && (d > waterRadius || pressuredToEnterWater)) {
          const attractionFalloff = clamp(1 - d / attractionRadius, 0, 1);
          const edgeTargetDistance = pressuredToEnterWater ? 0 : Math.min(d, waterRadius);
          const edgeTargetX = obstacle.x + (this.x - obstacle.x) / d * edgeTargetDistance;
          const edgeTargetY = obstacle.y + (this.y - obstacle.y) / d * edgeTargetDistance;
          const towardEdge = normalize(edgeTargetX - this.x, edgeTargetY - this.y);
          const attraction = attractionFalloff * data.waterAttractionStrength * (pressuredToEnterWater ? 1 : 0.9);
          forceX += towardEdge.x * attraction;
          forceY += towardEdge.y * attraction;
        }
        if (d < waterRadius) {
          const repulsionFalloff = clamp((waterRadius - d) / waterRadius, 0, 1);
          const repelDir = normalize(dx, dy);
          const repulsionStrength = data.waterRepulsionStrength * repulsionFalloff * (pressuredToEnterWater ? 0.24 : 1.8);
          forceX += repelDir.x * repulsionStrength;
          forceY += repelDir.y * repulsionStrength;
        }
        if (d < waterEdgeRadius) {
          const edgeFalloff = clamp((waterEdgeRadius - d) / data.waterEdgeBuffer, 0, 1);
          const slowdown = pressuredToEnterWater ? data.waterPressureSlowdown : data.waterEdgeSlowdown;
          waterSlowdown *= 1 - edgeFalloff * (1 - slowdown);
        }
      }
      if (obstacle.kind === 'bush' && obstacle.radius) {
        const dx = this.x - obstacle.x; const dy = this.y - obstacle.y; const d = Math.hypot(dx, dy) || 0.0001;
        const bushRadius = obstacle.radius + this.radius + 8;
        if (d < bushRadius + 70) {
          const repelDir = normalize(dx, dy);
          const bushFalloff = clamp((bushRadius + 70 - d) / (bushRadius + 70), 0, 1);
          const repulsionStrength = data.bushRepulsionStrength * bushFalloff * (pressureBias < 0.45 ? 1 : 0.25);
          forceX += repelDir.x * repulsionStrength;
          forceY += repelDir.y * repulsionStrength;
        }
        if (d < bushRadius) {
          const bushFalloff = clamp((bushRadius - d) / bushRadius, 0, 1);
          bushSlowdown *= 1 - bushFalloff * data.bushSlowdown;
        }
      }
      const nearestX = clamp(this.x, obstacle.x, obstacle.x + (obstacle.width || 0)); const nearestY = clamp(this.y, obstacle.y, obstacle.y + (obstacle.height || 0));
      const dx = this.x - nearestX; const dy = this.y - nearestY; const d = Math.hypot(dx, dy);
      if (d < data.obstacleBufferDistance && !obstacle.radius) { const away = d > 0.001 ? normalize(dx, dy) : { x: 0, y: 0 }; const ratio = (data.obstacleBufferDistance - d) / data.obstacleBufferDistance; const strength = ratio * ratio; forceX += away.x * strength * data.obstacleStrength; forceY += away.y * strength * data.obstacleStrength; }
    }
    const edgeDistance = data.edgeBufferDistance;
    if (this.x < edgeDistance) forceX += (1 - this.x / edgeDistance) * data.edgeBufferStrength;
    if (this.x > world.width - edgeDistance) forceX -= (1 - (world.width - this.x) / edgeDistance) * data.edgeBufferStrength;
    if (this.y < edgeDistance) forceY += (1 - this.y / edgeDistance) * data.edgeBufferStrength;
    if (this.y > world.height - edgeDistance) forceY -= (1 - (world.height - this.y) / edgeDistance) * data.edgeBufferStrength;
    if (pressure > 0) {
      const away = normalize(this.x - dog.x, this.y - dog.y);
      const outwardForce = forceX * away.x + forceY * away.y;
      const minimumOutwardForce = pressure * data.pressureDirectionBias;
      if (outwardForce < minimumOutwardForce) { forceX += away.x * (minimumOutwardForce - outwardForce); forceY += away.y * (minimumOutwardForce - outwardForce); }
    }
    let movement = normalize(forceX, forceY);
    const currentMovement = normalize(this.vx, this.vy);
    const currentSpeed = Math.hypot(this.vx, this.vy);
    if (currentSpeed > 1) { movement = normalize(movement.x * (1 - data.turnInertia) + currentMovement.x * data.turnInertia, movement.y * (1 - data.turnInertia) + currentMovement.y * data.turnInertia); }
    const responseAmount = Math.max(pressure, this.nervousness, clamp(Math.hypot(this.barkPush.x, this.barkPush.y) / dog.config.barkImpulse, 0, 1));
    const baseSpeed = data.grazingSpeed + (data.maxSpeed - data.grazingSpeed) * responseAmount;
    const speed = baseSpeed * archetype.speed * (1 + this.nervousness * data.nervousnessMovementMultiplier) * Math.min(bushSlowdown, waterSlowdown);
    this.desired = { x: movement.x * speed, y: movement.y * speed };
    const blend = Math.min(1, (3.5 + this.nervousness * 2) * dt); this.vx += (this.desired.x - this.vx) * blend; this.vy += (this.desired.y - this.vy) * blend;
    this.vx += this.barkPush.x; this.vy += this.barkPush.y;
    const barkDecay = Math.exp(-dog.config.barkImpulseDecay * dt); this.barkPush.x *= barkDecay; this.barkPush.y *= barkDecay;
    this.x += this.vx * dt; this.y += this.vy * dt;
    for (const obstacle of obstacles) { if (!obstacle.radius) circleRectResolve(this, obstacle); }
    keepInWorldWithBounce(this, world, data.edgeBounce);
  }
}
