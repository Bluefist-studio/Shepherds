export function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
export function length(x, y) { return Math.hypot(x, y); }
export function normalize(x, y) { const size = Math.hypot(x, y); return size > 0.0001 ? { x: x / size, y: y / size } : { x: 0, y: 0 }; }
export function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
export function lerp(a, b, amount) { return a + (b - a) * amount; }
export function approach(current, target, amount) { return current < target ? Math.min(current + amount, target) : Math.max(current - amount, target); }
export function circleRectResolve(entity, rect) {
  const nearestX = clamp(entity.x, rect.x, rect.x + rect.width);
  const nearestY = clamp(entity.y, rect.y, rect.y + rect.height);
  let dx = entity.x - nearestX;
  let dy = entity.y - nearestY;
  const d = Math.hypot(dx, dy);
  if (d >= entity.radius) return;
  if (d <= 0.0001) {
    const distances = [entity.x - rect.x, rect.x + rect.width - entity.x, entity.y - rect.y, rect.y + rect.height - entity.y];
    const smallest = Math.min(...distances);
    if (smallest === distances[0]) { dx = -1; dy = 0; }
    else if (smallest === distances[1]) { dx = 1; dy = 0; }
    else if (smallest === distances[2]) { dx = 0; dy = -1; }
    else { dx = 0; dy = 1; }
  }
  const normal = normalize(dx, dy);
  const push = entity.radius - d;
  entity.x += normal.x * push;
  entity.y += normal.y * push;
  const inward = entity.vx * normal.x + entity.vy * normal.y;
  if (inward < 0) { entity.vx -= inward * normal.x; entity.vy -= inward * normal.y; }
}
export function keepInWorld(entity, world) {
  entity.x = clamp(entity.x, entity.radius, world.width - entity.radius);
  entity.y = clamp(entity.y, entity.radius, world.height - entity.radius);
}
export function keepInWorldWithBounce(entity, world, restitution) {
  const minX = entity.radius; const maxX = world.width - entity.radius;
  const minY = entity.radius; const maxY = world.height - entity.radius;
  if (entity.x <= minX && entity.vx < 0) entity.vx = -entity.vx * restitution;
  if (entity.x >= maxX && entity.vx > 0) entity.vx = -entity.vx * restitution;
  if (entity.y <= minY && entity.vy < 0) entity.vy = -entity.vy * restitution;
  if (entity.y >= maxY && entity.vy > 0) entity.vy = -entity.vy * restitution;
  entity.x = clamp(entity.x, minX, maxX);
  entity.y = clamp(entity.y, minY, maxY);
}
