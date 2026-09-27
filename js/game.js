import { CONFIG, SHEEP_TYPES, createSheepComposition } from './config.js';
import { AudioManager } from './audio.js';
import { Camera } from './camera.js';
import { Dog } from './dog.js';
import { Flock } from './flock.js';
import { Input } from './input.js';
import { createLevel } from './level.js';
import { clamp } from './physics.js';
import { Sheep } from './sheep.js';

// Spawns sheep for every flock start: legacy starts share the level's flat composition round-robin,
// while starts with an explicit sheepCounts spawn their own composition independently.
function buildSpawnedSheep(level) {
  const starts = level.flockStarts || [level.flockStart];
  const legacyStarts = starts.filter((start) => !start.sheepCounts);
  const sheep = [];
  let index = 0;
  if (legacyStarts.length) {
    level.composition.forEach((type) => { const start = legacyStarts[index % legacyStarts.length]; const angle = index * 2.399; const ring = 55 + (index % 4) * 26; sheep.push(new Sheep(start.x + Math.cos(angle) * ring, start.y + Math.sin(angle) * ring, type, index)); index += 1; });
  }
  starts.forEach((start) => {
    if (!start.sheepCounts) return;
    createSheepComposition(start.sheepCounts).forEach((type, localIndex) => { const angle = localIndex * 2.399; const ring = 55 + (localIndex % 4) * 26; sheep.push(new Sheep(start.x + Math.cos(angle) * ring, start.y + Math.sin(angle) * ring, type, index)); index += 1; });
  });
  return sheep;
}

export class Game {
  constructor(canvas, levelId = 'preview') { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.input = new Input(canvas); this.camera = new Camera(canvas.width, canvas.height, CONFIG.camera); this.audio = new AudioManager(); this.lastTime = 0; this.elapsed = 0; this.completionCountdown = 0; this.paused = false; this.complete = false; this.failed = false; this.barkActive = false; this.levelId = levelId; this.level = createLevel(levelId); this.reset(); this.updateAudioState(); window.addEventListener('resize', () => this.resize()); this.resize(); }
  updateAudioState() { if (this.levelId === 'preview') this.audio.playMenu(); else this.audio.playLevel(); }
  selectLevel(levelId) { this.levelId = levelId; this.level = createLevel(levelId); this.reset(); this.updateAudioState(); this.resize(); }
  addSheep(type, amount) { if (!SHEEP_TYPES[type]) return; const start = this.level.flockStarts?.[0] || this.level.flockStart; const count = Math.max(1, Math.min(50, Math.floor(amount))); const currentCount = this.flock.sheep.length; for (let index = 0; index < count; index += 1) { const angle = (currentCount + index) * 2.399; const ring = 55 + ((currentCount + index) % 4) * 26; this.flock.sheep.push(new Sheep(start.x + Math.cos(angle) * ring, start.y + Math.sin(angle) * ring, type, currentCount + index)); } this.flock.linkFamilies(); this.updateHud(); }
  respawnFlock(counts) { if (!this.level.practice) return; this.level.sheepCounts = { ...this.level.sheepCounts, ...counts }; this.level.composition = createSheepComposition(this.level.sheepCounts); const sheep = buildSpawnedSheep(this.level); this.flock = new Flock(sheep, this.level.gates); this.elapsed = 0; this.completionCountdown = 0; this.complete = false; this.failed = false; this.paused = false; this.audio.stopLevelEnd(); this.audio.setLowStamina(false); document.getElementById('success').hidden = true; document.getElementById('failure').hidden = true; document.getElementById('levelRating').textContent = ''; this.updateHud(); }
  reset() { const starts = this.level.flockStarts || [this.level.flockStart]; const sheep = buildSpawnedSheep(this.level); const start = this.level.playerStart || { x: starts[0].x - 470, y: starts[0].y }; this.dog = new Dog(start.x, start.y, CONFIG.dog); this.flock = new Flock(sheep, this.level.gates); this.elapsed = 0; this.completionCountdown = 0; this.complete = false; this.failed = false; this.audio.stopLevelEnd(); this.audio.setLowStamina(false); document.getElementById('success').hidden = true; document.getElementById('failure').hidden = true; document.getElementById('levelRating').textContent = ''; document.querySelector('.eyebrow').textContent = this.level.title || 'FIELD TEST // 01'; document.querySelector('.objective').textContent = this.level.name || 'Guide the whole flock into the marked pasture.'; }
  resize() { const dpr = Math.min(window.devicePixelRatio || 1, 2); this.canvas.width = Math.floor(window.innerWidth * dpr); this.canvas.height = Math.floor(window.innerHeight * dpr); this.canvas.style.width = `${window.innerWidth}px`; this.canvas.style.height = `${window.innerHeight}px`; this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); this.camera.resize(window.innerWidth, window.innerHeight); if (this.levelId === 'preview') { this.level.world = { width: window.innerWidth, height: window.innerHeight }; this.level.flockStart = { x: window.innerWidth / 2, y: window.innerHeight / 2 }; if (this.flock) this.reset(); } }
  run(time) { const dt = Math.min((time - this.lastTime) / 1000 || 0, 0.033); this.lastTime = time; this.update(dt); this.render(); requestAnimationFrame((next) => this.run(next)); }
  update(dt) { if (this.paused) { this.audio.setLowStamina(false); return; } if (this.input.down('r')) { this.input.keys.delete('r'); this.reset(); } if (this.complete || this.failed) { this.audio.setLowStamina(false); return; } this.elapsed = this.level.practice ? this.elapsed + dt : Math.min(this.level.timeLimit, this.elapsed + dt); if (this.levelId !== 'preview') { let closestSheep = null; let closestDistSq = Infinity; for (const s of this.flock.sheep) { const dSq = (s.x - this.dog.x) ** 2 + (s.y - this.dog.y) ** 2; if (dSq < closestDistSq) { closestDistSq = dSq; closestSheep = s; } } this.dog.update(this.input, this.level.obstacles, this.level.world, dt, closestSheep); this.audio.setLowStamina(this.dog.stamina < 25); } if (this.input.consumeBark()) { this.barkActive = this.dog.bark(); if (this.barkActive) this.audio.bark(); } else this.barkActive = false; this.flock.update(this.dog, this.level.obstacles, this.level.world, dt, this.barkActive); if (this.levelId === 'preview') { this.camera.x = Math.max(0, (this.level.world.width - window.innerWidth) / 2); this.camera.y = Math.max(0, (this.level.world.height - window.innerHeight) / 2); } else this.camera.update(this.dog, this.input.mouse, this.level.world, dt); if (this.levelId !== 'preview') { const inPasture = this.flock.inTarget(this.level.target) === this.flock.sheep.length; if (!inPasture) this.completionCountdown = 0; else if (this.completionCountdown === 0) this.completionCountdown = 3; else { this.completionCountdown = Math.max(0, this.completionCountdown - dt); if (this.completionCountdown === 0) { this.complete = true; this.showRating(); this.audio.playLevelEnd(true); document.getElementById('success').hidden = false; } } if (!this.level.practice && !this.complete && this.elapsed >= this.level.timeLimit) { this.failed = true; this.paused = true; this.audio.playLevelEnd(false); document.getElementById('failure').hidden = false; } } this.updateHud(); }
  showRating() { if (this.level.testOnly || this.level.custom) { document.getElementById('levelRating').textContent = ''; return; } const stars = this.level.practice ? 3 : (() => { const remainingFraction = Math.max(0, (this.level.timeLimit - this.elapsed) / this.level.timeLimit); return remainingFraction >= 0.5 ? 3 : remainingFraction >= 0.25 ? 2 : remainingFraction > 0 ? 1 : 0; })(); document.getElementById('levelRating').textContent = `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`; this.recordBestTime(); let previousTotal = 0; let newTotal = 0; let improved = false; try { const ratings = JSON.parse(localStorage.getItem('sheep-level-ratings') || '{}'); previousTotal = Object.values(ratings).reduce((total, value) => total + value, 0); const previousBest = ratings[this.levelId] || 0; const best = Math.max(previousBest, stars); improved = best > previousBest; ratings[this.levelId] = best; newTotal = previousTotal + (best - previousBest); localStorage.setItem('sheep-level-ratings', JSON.stringify(ratings)); } catch {} window.dispatchEvent(new CustomEvent('level-rating-updated', { detail: { previousTotal, newTotal, improved } })); }
  recordBestTime() { try { const times = JSON.parse(localStorage.getItem('sheep-level-times') || '{}'); const previousBest = times[this.levelId]; if (!previousBest || this.elapsed < previousBest) { times[this.levelId] = this.elapsed; localStorage.setItem('sheep-level-times', JSON.stringify(times)); } } catch {} }
  updateHud() { const count = this.flock.inTarget(this.level.target); const average = this.flock.averageNervousness(); const remaining = Math.max(0, this.level.timeLimit - this.elapsed); const minutes = Math.floor(remaining / 60); const seconds = Math.floor(remaining % 60).toString().padStart(2, '0'); document.getElementById('flockCount').textContent = `${count} / ${this.flock.sheep.length}`; document.getElementById('timerValue').textContent = this.level.practice ? '∞' : `${minutes}:${seconds}`; document.getElementById('nervesValue').textContent = `${Math.round(average * 100)}%`; document.getElementById('speedValue').textContent = `${Math.round(Math.hypot(this.dog.vx, this.dog.vy))}`; document.getElementById('staminaValue').textContent = `${Math.round(this.dog.stamina)} / ${CONFIG.dog.maxStamina}`; const fill = document.getElementById('staminaFill'); fill.style.width = `${this.dog.stamina}%`; fill.style.background = this.dog.stamina < 25 ? '#f77c62' : '#d8ef72'; const countdown = document.getElementById('completionCountdown'); countdown.hidden = this.levelId === 'preview' || this.completionCountdown <= 0 || this.complete; document.getElementById('completionCountdownText').textContent = `${this.completionCountdown.toFixed(1)}s`; document.querySelector('#completionCountdown b').style.width = `${Math.max(0, Math.min(100, this.completionCountdown / 3 * 100))}%`; }
  render() { const ctx = this.ctx; const width = window.innerWidth; const height = window.innerHeight; ctx.clearRect(0, 0, width, height); ctx.save(); ctx.translate(-this.camera.x, -this.camera.y); this.drawWorld(ctx); this.drawTarget(ctx); this.drawGates(ctx); this.drawObstacles(ctx); if (this.levelId !== 'preview' && CONFIG.debug.showPresence) this.drawCircle(ctx, this.dog.x, this.dog.y, CONFIG.dog.presenceRange, 'rgba(247,124,98,.08)', 'rgba(247,124,98,.18)'); for (const sheep of this.flock.sheep) this.drawSheep(ctx, sheep); if (this.levelId !== 'preview') this.drawDog(ctx); ctx.restore(); if (this.levelId !== 'preview') { this.drawTargetIndicator(ctx); this.drawSheepIndicators(ctx); } }
  // Points to the pasture target from the nearest screen edge whenever it isn't currently on screen.
  drawTargetIndicator(ctx) {
    const target = this.level.target;
    const viewLeft = this.camera.x; const viewTop = this.camera.y;
    const viewRight = viewLeft + window.innerWidth; const viewBottom = viewTop + window.innerHeight;
    const inView = target.x < viewRight && target.x + target.width > viewLeft && target.y < viewBottom && target.y + target.height > viewTop;
    if (inView) return;
    this.drawEdgeArrow(ctx, target.x + target.width / 2, target.y + target.height / 2, '#d8ef72');
  }
  // Groups off-screen sheep by proximity (like separate sub-flocks) and shows one arrow per group, pointing at its centroid.
  drawSheepIndicators(ctx) {
    const viewLeft = this.camera.x; const viewTop = this.camera.y;
    const viewRight = viewLeft + window.innerWidth; const viewBottom = viewTop + window.innerHeight;
    const margin = 40;
    const offscreen = this.flock.sheep.filter((sheep) => sheep.x < viewLeft - margin || sheep.x > viewRight + margin || sheep.y < viewTop - margin || sheep.y > viewBottom + margin);
    if (!offscreen.length) return;
    const clusterRadius = 260;
    const visited = new Set();
    offscreen.forEach((sheep, index) => {
      if (visited.has(index)) return;
      const cluster = [sheep]; visited.add(index);
      const queue = [sheep];
      while (queue.length) {
        const current = queue.pop();
        offscreen.forEach((other, otherIndex) => { if (!visited.has(otherIndex) && Math.hypot(current.x - other.x, current.y - other.y) < clusterRadius) { visited.add(otherIndex); cluster.push(other); queue.push(other); } });
      }
      const centerX = cluster.reduce((sum, item) => sum + item.x, 0) / cluster.length;
      const centerY = cluster.reduce((sum, item) => sum + item.y, 0) / cluster.length;
      this.drawEdgeArrow(ctx, centerX, centerY, '#f7c65c');
    });
  }
  // Projects a world point onto the nearest screen edge (with margin) and draws an arrow pointing at it.
  drawEdgeArrow(ctx, worldX, worldY, color) {
    const screenCenterX = window.innerWidth / 2; const screenCenterY = window.innerHeight / 2;
    const dx = (worldX - this.camera.x) - screenCenterX;
    const dy = (worldY - this.camera.y) - screenCenterY;
    const angle = Math.atan2(dy, dx);
    const margin = 46;
    const scale = Math.min((screenCenterX - margin) / (Math.abs(dx) || 0.0001), (screenCenterY - margin) / (Math.abs(dy) || 0.0001));
    const arrowX = screenCenterX + dx * scale; const arrowY = screenCenterY + dy * scale;
    ctx.save(); ctx.translate(arrowX, arrowY); ctx.rotate(angle);
    ctx.fillStyle = color; ctx.strokeStyle = '#12231c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-10, -11); ctx.lineTo(-10, 11); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  drawWorld(ctx) { ctx.fillStyle = '#294a34'; ctx.fillRect(0, 0, CONFIG.world.width, CONFIG.world.height); ctx.strokeStyle = 'rgba(216,239,114,.06)'; ctx.lineWidth = 1; for (let x = 0; x < CONFIG.world.width; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CONFIG.world.height); ctx.stroke(); } for (let y = 0; y < CONFIG.world.height; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CONFIG.world.width, y); ctx.stroke(); } }
  drawTarget(ctx) { if (this.levelId === 'preview') return; const target = this.level.target; ctx.fillStyle = 'rgba(216,239,114,.16)'; ctx.strokeStyle = '#d8ef72'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.fillRect(target.x, target.y, target.width, target.height); ctx.strokeRect(target.x, target.y, target.width, target.height); ctx.setLineDash([]); ctx.fillStyle = '#d8ef72'; ctx.font = '500 13px DM Mono'; ctx.textAlign = 'center'; ctx.fillText('PASTURE', target.x + target.width / 2, target.y + 32); }
  drawObstacles(ctx) { for (const obstacle of this.level.obstacles) { if (obstacle.radius) { const fill = obstacle.kind === 'water' ? '#1b4e7c' : '#305d2b'; const stroke = obstacle.kind === 'water' ? '#7bd3ff' : '#9cda71'; ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(obstacle.x, obstacle.y, obstacle.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); continue; } if (obstacle.kind === 'building') { this.drawBuilding(ctx, obstacle); continue; } ctx.fillStyle = obstacle.kind === 'rock' ? '#51634b' : '#203229'; ctx.strokeStyle = obstacle.kind === 'rock' ? '#718166' : '#d2b877'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height, obstacle.kind === 'rock' ? 18 : 5); ctx.fill(); ctx.stroke(); } }
  // Gable rooftop: ridge runs along the longest edge, two sloped panes meeting at it, drawn over a body rect.
  drawBuilding(ctx, obstacle) { const { x, y, width, height } = obstacle; ctx.fillStyle = '#4a3d2f'; ctx.strokeStyle = '#8a7457'; ctx.lineWidth = 3; ctx.fillRect(x, y, width, height); ctx.strokeRect(x, y, width, height); ctx.fillStyle = '#8a5a3f'; ctx.beginPath(); if (width >= height) { const ridgeY = y + height * 0.4; const ridgeX1 = x + width * 0.12; const ridgeX2 = x + width * 0.88; ctx.moveTo(ridgeX1, ridgeY); ctx.lineTo(ridgeX2, ridgeY); ctx.lineTo(x + width, y + height); ctx.lineTo(x, y + height); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#c98a56'; ctx.beginPath(); ctx.moveTo(ridgeX1, ridgeY); ctx.lineTo(ridgeX2, ridgeY); ctx.stroke(); } else { const ridgeX = x + width * 0.4; const ridgeY1 = y + height * 0.12; const ridgeY2 = y + height * 0.88; ctx.moveTo(ridgeX, ridgeY1); ctx.lineTo(ridgeX, ridgeY2); ctx.lineTo(x + width, y + height); ctx.lineTo(x + width, y); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#c98a56'; ctx.beginPath(); ctx.moveTo(ridgeX, ridgeY1); ctx.lineTo(ridgeX, ridgeY2); ctx.stroke(); } }
  drawGates(ctx) { for (const gate of this.level.gates) { ctx.fillStyle = 'rgba(247,124,98,.14)'; ctx.strokeStyle = '#f77c62'; ctx.lineWidth = 2; ctx.setLineDash([8, 7]); ctx.strokeRect(gate.x, gate.y, gate.width, gate.height); ctx.setLineDash([]); ctx.fillRect(gate.x, gate.y, gate.width, gate.height); ctx.save(); ctx.translate(gate.x + gate.width / 2, gate.y + gate.height / 2); if (gate.height > gate.width) ctx.rotate(Math.PI / 2); ctx.fillStyle = '#f7a08d'; ctx.font = '500 12px DM Mono'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(gate.label, 0, 0); ctx.restore(); } }
  drawSheep(ctx, sheep) {
    const style = SHEEP_TYPES[sheep.type];
    const speed = Math.hypot(sheep.vx, sheep.vy);
    const moving = Math.min(1, speed / 100);
    const nervousAmount = sheep.nervousness;
    const pulse = nervousAmount > 0.05 ? (Math.sin(performance.now() / 1000 * CONFIG.sheep.nervousPulseSpeed) * 0.5 + 0.5) * nervousAmount : 0;
    const nervousColor = CONFIG.sheep.nervousVisualColor;
    const contourColor = nervousAmount > 0.05 ? this.mixColors('#12231c', nervousColor, nervousAmount) : '#12231c';
    const facing = sheep.facing || (speed > 1 ? { x: sheep.vx / speed, y: sheep.vy / speed } : { x: Math.cos(sheep.grazingPhase), y: Math.sin(sheep.grazingPhase) });
    const bodyRadius = sheep.radius + pulse * CONFIG.sheep.nervousPulseSize;
    ctx.save();
    ctx.translate(sheep.x, sheep.y);
    if (pulse > 0) { ctx.fillStyle = this.colorWithAlpha(nervousColor, 0.08 + pulse * 0.18); ctx.beginPath(); ctx.arc(0, 0, bodyRadius + 7, 0, Math.PI * 2); ctx.fill(); }
    ctx.rotate(Math.atan2(facing.y, facing.x));
    // Tail
    const tailWiggle = Math.sin(sheep.grazingPhase * 6) * moving * (bodyRadius * 0.25);
    ctx.fillStyle = '#f4f0e5'; ctx.strokeStyle = contourColor; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(-bodyRadius * 1.25, tailWiggle, bodyRadius * 0.22, bodyRadius * 0.28, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // Body
    ctx.fillStyle = '#f4f0e5'; ctx.strokeStyle = contourColor; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(-2, 0, bodyRadius * 1.12, bodyRadius * 0.9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const markSide = sheep.index % 2 === 0 ? -1 : 1;
    ctx.fillStyle = style.color;
    ctx.beginPath(); ctx.ellipse(-bodyRadius * 0.52, markSide * bodyRadius * 0.35, bodyRadius * 0.31, bodyRadius * 0.22, markSide * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e7e1d5'; ctx.strokeStyle = contourColor; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(bodyRadius * 0.5, -bodyRadius * 0.4, bodyRadius * 0.3, bodyRadius * 0.17, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(bodyRadius * 0.5, bodyRadius * 0.4, bodyRadius * 0.3, bodyRadius * 0.17, 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#28342d'; ctx.strokeStyle = contourColor; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(bodyRadius * 0.68, 0, bodyRadius * 0.54, bodyRadius * 0.34, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
    if (CONFIG.debug.showDesired) { ctx.strokeStyle = style.accent; ctx.beginPath(); ctx.moveTo(sheep.x, sheep.y); ctx.lineTo(sheep.x + sheep.desired.x, sheep.y + sheep.desired.y); ctx.stroke(); }
  }
    mixColors(first, second, amount) { const parse = (color) => { const value = color.replace('#', ''); return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)]; }; const a = parse(first); const b = parse(second); const blend = Math.max(0, Math.min(1, amount)); return `rgb(${Math.round(a[0] + (b[0] - a[0]) * blend)},${Math.round(a[1] + (b[1] - a[1]) * blend)},${Math.round(a[2] + (b[2] - a[2]) * blend)})`; }
    colorWithAlpha(hex, alpha) { const value = hex.replace('#', ''); const red = parseInt(value.slice(0, 2), 16); const green = parseInt(value.slice(2, 4), 16); const blue = parseInt(value.slice(4, 6), 16); return `rgba(${red},${green},${blue},${alpha})`; }
  drawDog(ctx) {
    const dog = this.dog; const radius = dog.radius;
    const dogFacingAngle = Math.atan2(dog.facing.y, dog.facing.x);
    const tailWorld1 = dog.tailAngle ?? (dogFacingAngle + Math.PI);
    const tailWorld2 = dog.tailAngle2 ?? tailWorld1;
    const relAngle1 = clamp(Math.atan2(Math.sin(tailWorld1 - (dogFacingAngle + Math.PI)), Math.cos(tailWorld1 - (dogFacingAngle + Math.PI))), -0.9, 0.9);
    const relAngle2 = clamp(Math.atan2(Math.sin(tailWorld2 - (dogFacingAngle + Math.PI)), Math.cos(tailWorld2 - (dogFacingAngle + Math.PI))), -1.2, 1.2);

    const baseLen = radius * 0.58;
    const tipLen = radius * 0.55;
    const startX = -radius * 0.88;
    const startY = 0;
    const jointX = startX - Math.cos(-relAngle1) * baseLen;
    const jointY = startY + Math.sin(-relAngle1) * baseLen;
    const tipX = jointX - Math.cos(-relAngle2) * tipLen;
    const tipY = jointY + Math.sin(-relAngle2) * tipLen;

    const dogHeadAngle = dog.headAngle ?? dogFacingAngle;
    const neckLook = clamp(Math.atan2(Math.sin(dogHeadAngle - dogFacingAngle), Math.cos(dogHeadAngle - dogFacingAngle)), -0.65, 0.65);
    const neckPivotX = radius * 0.48;
    const neckPivotY = 0;

    ctx.save(); ctx.translate(dog.x, dog.y); ctx.rotate(dogFacingAngle);

    // Section 1 (base to joint, black)
    ctx.strokeStyle = '#0e1512'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(jointX, jointY);
    ctx.stroke();

    // Section 2 (joint to tip: black root + white tip)
    ctx.strokeStyle = '#0e1512'; ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(jointX, jointY);
    ctx.lineTo(jointX + (tipX - jointX) * 0.45, jointY + (tipY - jointY) * 0.45);
    ctx.stroke();

    ctx.strokeStyle = '#c3cac7'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(jointX + (tipX - jointX) * 0.45, jointY + (tipY - jointY) * 0.45);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    // Body
    ctx.fillStyle = '#1f1f1f'; ctx.strokeStyle = '#0e1512'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(-radius * 0.15, 0, radius * 0.9, radius * 0.25, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#292929';
    ctx.beginPath(); ctx.ellipse(-radius * 0.35, 0, radius * 0.5, radius * 0.2, 0, 0, Math.PI * 2); ctx.fill();

    // White neck/collar marking behind the neck joint
    ctx.fillStyle = '#c3cac7';
    ctx.beginPath(); ctx.ellipse(radius * 0.3, 0, radius * 0.12, radius * 0.25, 0, 0, Math.PI * 2); ctx.fill();

    // Neck joint & Head (rotates slightly toward closest sheep)
    ctx.save();
    ctx.translate(neckPivotX, neckPivotY);
    ctx.rotate(neckLook);
    const headRelX = radius * 0.26;

    // Ears (attached to head, folded backward along the body/running line with white tips)
    ctx.fillStyle = '#1a1a1a'; ctx.strokeStyle = '#0e1512'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(headRelX - radius * 0.16, -radius * 0.2, radius * 0.22, radius * 0.1, -2.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(headRelX - radius * 0.16, radius * 0.2, radius * 0.22, radius * 0.1, 2.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    //ctx.fillStyle = '#c3cac7';
    //ctx.beginPath(); ctx.ellipse(headRelX - radius * 0.28, -radius * 0.27, radius * 0.08, radius * 0.06, -2.4, 0, Math.PI * 2); ctx.fill();
    //ctx.beginPath(); ctx.ellipse(headRelX - radius * 0.28, radius * 0.27, radius * 0.08, radius * 0.06, 2.4, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#292929'; ctx.strokeStyle = '#0e1512'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(headRelX, 0, radius * 0.4, radius * 0.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c3cac7';
    ctx.beginPath(); ctx.ellipse(headRelX + radius * 0.23, 0, radius * 0.15, radius * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.restore();
    if (dog.barkPulse > 0) { const progress = 1 - dog.barkPulse / .55; this.drawCircle(ctx, dog.x, dog.y, 35 + progress * CONFIG.dog.barkRange, 'transparent', `rgba(216,239,114,${1 - progress})`); }
  }
  drawCircle(ctx, x, y, radius, fill, stroke) { ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
}
