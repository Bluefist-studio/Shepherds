import { approach, circleRectResolve, clamp, length, normalize } from './physics.js';

export class Dog {
  constructor(x, y, config) { this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.radius = config.radius; this.stamina = config.maxStamina; this.facing = { x: 1, y: 0 }; this.headAngle = 0; this.tailAngle = Math.PI; this.tailAngle2 = Math.PI; this.barkPulse = 0; this.config = config; }
  update(input, obstacles, world, dt, closestSheep = null) {
    const x = Number(input.down('d','arrowright')) - Number(input.down('a','arrowleft'));
    const y = Number(input.down('s','arrowdown')) - Number(input.down('w','arrowup'));
    const direction = normalize(x, y);
    const hasInput = length(x, y) > 0;
    const sprinting = input.down('shift') && this.stamina > 0.5 && hasInput;
    const walking = input.down('c');
    const targetSpeed = sprinting ? this.config.sprintSpeed : walking ? this.config.walkSpeed : this.config.jogSpeed;

    if (hasInput) {
      const desiredAngle = Math.atan2(direction.y, direction.x);
      const currentFacingAngle = Math.atan2(this.facing.y, this.facing.x);
      const angleDiff = Math.atan2(Math.sin(desiredAngle - currentFacingAngle), Math.cos(desiredAngle - currentFacingAngle));
      const baseTurnRate = this.config.turnSpeed || 10.5;
      const turnRate = baseTurnRate * (sprinting ? 0.85 : walking ? 1.3 : 1.0);
      const step = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), turnRate * dt);
      const newFacingAngle = currentFacingAngle + step;
      this.facing = { x: Math.cos(newFacingAngle), y: Math.sin(newFacingAngle) };

      const alignment = Math.max(0, Math.cos(angleDiff));
      const forwardSpeed = targetSpeed * (0.25 + 0.75 * alignment);
      const targetVx = this.facing.x * forwardSpeed;
      const targetVy = this.facing.y * forwardSpeed;
      this.vx = approach(this.vx, targetVx, this.config.acceleration * dt);
      this.vy = approach(this.vy, targetVy, this.config.acceleration * dt);
    } else {
      this.vx = approach(this.vx, 0, this.config.deceleration * dt);
      this.vy = approach(this.vy, 0, this.config.deceleration * dt);
    }

    if (sprinting) this.stamina = Math.max(0, this.stamina - this.config.sprintStaminaDrain * dt);
    else this.stamina = Math.min(this.config.maxStamina, this.stamina + this.config.staminaRecoveryRate * dt);
    let obstacleSlowdown = 1;
    for (const obstacle of obstacles) {
      if (!obstacle.radius) continue;
      const dx = this.x - obstacle.x; const dy = this.y - obstacle.y; const distance = Math.hypot(dx, dy); const limit = this.radius + obstacle.radius;
      if (distance < limit) {
        const falloff = 1 - distance / limit;
        if (obstacle.kind === 'water') obstacleSlowdown *= 1 - falloff * this.config.waterSlowdown;
        if (obstacle.kind === 'bush') obstacleSlowdown *= 1 - falloff * 0.6;
      }
    }
    this.vx *= obstacleSlowdown; this.vy *= obstacleSlowdown;
    const bodyAngle = Math.atan2(this.facing.y, this.facing.x);
    let targetHeadAngle = bodyAngle;
    const maxLookDistance = (this.config.presenceRange || 130) * 1.5;
    if (!sprinting && closestSheep) {
      const dxS = closestSheep.x - this.x;
      const dyS = closestSheep.y - this.y;
      const distS = Math.hypot(dxS, dyS);
      if (distS <= maxLookDistance) {
        const sheepAngle = Math.atan2(dyS, dxS);
        const angleDiffSheep = Math.atan2(Math.sin(sheepAngle - bodyAngle), Math.cos(sheepAngle - bodyAngle));
        const lookOffset = clamp(angleDiffSheep, -0.45, 0.45);
        targetHeadAngle = bodyAngle + lookOffset;
      }
    }
    const headDiff = Math.atan2(Math.sin(targetHeadAngle - this.headAngle), Math.cos(targetHeadAngle - this.headAngle));
    this.headAngle += headDiff * Math.min(1, 10 * dt);

    const currentSpeed = length(this.vx, this.vy);
    const movingFactor = clamp(currentSpeed / 40, 0, 1);
    const targetTailAngle = Math.atan2(-this.facing.y, -this.facing.x);
    const idleWag = (1 - movingFactor) * Math.sin(performance.now() / 200) * 0.45;
    const idleWag2 = (1 - movingFactor) * Math.sin(performance.now() / 200 - 0.7) * 0.65;
    const angleDiff1 = Math.atan2(Math.sin(targetTailAngle - this.tailAngle), Math.cos(targetTailAngle - this.tailAngle));
    const followRate1 = 9 + movingFactor * 12;
    this.tailAngle += angleDiff1 * Math.min(1, followRate1 * dt) + idleWag * dt * 6;
    const angleDiff2 = Math.atan2(Math.sin(this.tailAngle - this.tailAngle2), Math.cos(this.tailAngle - this.tailAngle2));
    const followRate2 = 12 + movingFactor * 14;
    this.tailAngle2 += angleDiff2 * Math.min(1, followRate2 * dt) + idleWag2 * dt * 7;
    this.x += this.vx * dt; this.y += this.vy * dt;
    for (const obstacle of obstacles) { if (!obstacle.radius) circleRectResolve(this, obstacle); }
    this.x = clamp(this.x, this.radius, world.width - this.radius); this.y = clamp(this.y, this.radius, world.height - this.radius);
    this.barkPulse = Math.max(0, this.barkPulse - dt);
  }
  bark() { if (this.stamina < this.config.barkStaminaCost) return false; this.stamina -= this.config.barkStaminaCost; this.barkPulse = 0.55; return true; }
}
