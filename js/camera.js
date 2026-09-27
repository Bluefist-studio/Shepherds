import { clamp, lerp, normalize } from './physics.js';

export class Camera {
  constructor(width, height, config) { this.width = width; this.height = height; this.config = config; this.x = 0; this.y = 0; }
  resize(width, height) { this.width = width; this.height = height; }
  update(dog, mouse, world, dt) {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const offset = normalize(mouse.x - centerX, mouse.y - centerY);
    const distance = Math.min(Math.hypot(mouse.x - centerX, mouse.y - centerY) / Math.max(centerX, centerY), 1);
    const look = distance * this.config.lookRadius * this.config.mouseSensitivity;
    const targetX = clamp(dog.x + offset.x * look - this.width / 2, 0, Math.max(0, world.width - this.width));
    const targetY = clamp(dog.y + offset.y * look - this.height / 2, 0, Math.max(0, world.height - this.height));
    const blend = 1 - Math.exp(-this.config.smoothing * dt);
    this.x = lerp(this.x, targetX, blend); this.y = lerp(this.y, targetY, blend);
  }
  screenToWorld(x, y) { return { x: x + this.x, y: y + this.y }; }
}
