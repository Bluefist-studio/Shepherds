import { CONFIG } from './config.js';
import { circleRectResolve, distance } from './physics.js';

export class Flock {
  constructor(sheep, gates) { this.sheep = sheep; this.gates = gates; this.gateSignals = []; this.linkFamilies(); }
  linkFamilies() {
    const mothers = this.sheep.filter((sheep) => sheep.type === 'blue');
    const lambs = this.sheep.filter((sheep) => sheep.type === 'lightBlue');
    lambs.forEach((lamb, index) => { lamb.motherIndex = mothers.length ? mothers[index < mothers.length ? index : (index - mothers.length) % mothers.length].index : null; });
  }
  update(dog, obstacles, world, dt, barkActive) {
    this.gateSignals = this.gateSignals.filter((signal) => { signal.age += dt; return signal.age < signal.duration; });
    for (const sheep of this.sheep) sheep.alignmentVelocity = { x: sheep.vx, y: sheep.vy };
    for (const sheep of this.sheep) sheep.pressureSnapshot = sheep.pressureLevel;
    for (const sheep of this.sheep) sheep.nervousnessSnapshot = sheep.nervousness;
    const previousPositions = new Map(this.sheep.map((sheep) => [sheep, { x: sheep.x, y: sheep.y }]));
    for (const sheep of this.sheep) sheep.update(this, dog, obstacles, world, dt, barkActive);
    for (const sheep of this.sheep) this.recordGateCrossing(sheep, previousPositions.get(sheep));
    for (let iter = 0; iter < 2; iter += 1) {
      for (let i = 0; i < this.sheep.length; i += 1) {
        for (let j = i + 1; j < this.sheep.length; j += 1) {
          const a = this.sheep[i]; const b = this.sheep[j];
          const dx = a.x - b.x; const dy = a.y - b.y;
          const d = Math.hypot(dx, dy) || 0.001;
          const min = a.radius + b.radius;
          if (d < min) {
            const nx = dx / d; const ny = dy / d;
            const overlap = min - d;
            const totalMass = a.mass + b.mass;
            const aShare = b.mass / totalMass;
            const bShare = a.mass / totalMass;
            a.x += nx * overlap * aShare * 0.5;
            a.y += ny * overlap * aShare * 0.5;
            b.x -= nx * overlap * bShare * 0.5;
            b.y -= ny * overlap * bShare * 0.5;
            const relNormal = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
            if (relNormal < 0) {
              a.vx -= nx * relNormal * aShare;
              a.vy -= ny * relNormal * aShare;
              b.vx += nx * relNormal * bShare;
              b.vy += ny * relNormal * bShare;
            }
          }
        }
      }
    }
    for (const sheep of this.sheep) {
      for (const obstacle of obstacles) {
        if (!obstacle.radius) circleRectResolve(sheep, obstacle);
      }
    }
  }
  recordGateCrossing(sheep, previousPosition) {
    for (const gate of this.gates) {
      const wasInside = this.isInsideGate(previousPosition, gate);
      const isInside = this.isInsideGate(sheep, gate);
      if (!wasInside && isInside) {
        const direction = Math.hypot(sheep.vx, sheep.vy) > 0.1 ? { x: sheep.vx, y: sheep.vy } : { x: gate.width > gate.height ? 1 : 0, y: gate.width > gate.height ? 0 : 1 };
        const crossingDirection = { x: direction.x / Math.hypot(direction.x, direction.y), y: direction.y / Math.hypot(direction.x, direction.y) };
        this.gateSignals.push({ x: gate.x + gate.width / 2, y: gate.y + gate.height / 2, direction: crossingDirection, age: 0, duration: CONFIG.sheep.gateSignalDuration });
        sheep.gateSignalCooldown = 0.2;
      }
    }
  }
  isInsideGate(position, gate) { return position.x >= gate.x - 18 && position.x <= gate.x + gate.width + 18 && position.y >= gate.y - 18 && position.y <= gate.y + gate.height + 18; }
  inTarget(target) { return this.sheep.filter((sheep) => sheep.x - sheep.radius >= target.x && sheep.x + sheep.radius <= target.x + target.width && sheep.y - sheep.radius >= target.y && sheep.y + sheep.radius <= target.y + target.height).length; }
  averageNervousness() { return this.sheep.reduce((total, sheep) => total + sheep.nervousness, 0) / this.sheep.length; }
}
