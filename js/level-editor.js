import { registerLevel } from './level-settings.js';
import { CONFIG } from './config.js';

const WORLD = CONFIG.world;
const STANDARD_WALL_WIDTH = 20;
const GRID_SIZE = 100;
const TYPES = ['fence', 'rock', 'water', 'bush', 'gate', 'pasture', 'flock', 'player', 'erase'];
const CIRCLE_OBSTACLE_KINDS = new Set(['water', 'bush']);
const SHEEP_TYPE_ORDER = ['green', 'yellow', 'orange', 'red', 'lightBlue', 'blue'];
const MOVE_HOLD_DELAY = 1000;

export class LevelEditor {
  constructor(canvas, onLoad) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onLoad = onLoad;
    this.level = this.blankLevel();
    this.editingId = null;
    this.tool = 'fence';
    this.zoom = 1;
    this.dragStart = null;
    this.dragMove = null;
    this.pendingMove = null;
    this.moveHoldTimer = null;
    this.flockModalIndex = null;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    canvas.addEventListener('pointerdown', (event) => this.pointerDown(event));
    canvas.addEventListener('pointermove', (event) => this.pointerMove(event));
    canvas.addEventListener('wheel', (event) => { event.preventDefault(); this.setZoom(this.zoom + (event.deltaY < 0 ? 0.25 : -0.25)); }, { passive: false });
    window.addEventListener('pointerup', () => this.pointerUp());
    this.bindControls();
    this.render();
  }
  blankLevel() {
    return { title: 'CUSTOM FIELD', name: 'My level', timeLimit: 600, world: { ...WORLD }, playerStart: { x: 400, y: 1100 }, flockStarts: [{ x: 600, y: 1100 }], target: { x: 2800, y: 700, width: 500, height: 800 }, sheepCounts: { green: 20, yellow: 0, orange: 0, red: 0, lightBlue: 0, blue: 0 }, obstacles: [], gates: [] };
  }
  resize() { this.canvas.width = WORLD.width; this.canvas.height = WORLD.height; this.render(); }
  setZoom(value) { this.zoom = Math.max(0.5, Math.min(3, Math.round(value * 4) / 4)); this.canvas.style.width = `${this.zoom * 100}%`; this.canvas.style.height = 'auto'; const label = document.getElementById('editorZoomLabel'); if (label) label.textContent = `${Math.round(this.zoom * 100)}%`; }
  setTool(tool) { this.tool = tool; document.querySelectorAll('[data-editor-tool]').forEach((button) => button.classList.toggle('active', button.dataset.editorTool === tool)); }
  pointerPosition(event) { const rect = this.canvas.getBoundingClientRect(); const x = (event.clientX - rect.left) * WORLD.width / rect.width; const y = (event.clientY - rect.top) * WORLD.height / rect.height; return { x: Math.round(x / GRID_SIZE) * GRID_SIZE, y: Math.round(y / GRID_SIZE) * GRID_SIZE }; }
  findMovable(point) {
    let nearestFlock = -1; let nearestFlockDistance = 22;
    this.level.flockStarts.forEach((start, index) => { const distance = Math.hypot(start.x - point.x, start.y - point.y); if (distance < nearestFlockDistance) { nearestFlock = index; nearestFlockDistance = distance; } });
    if (nearestFlock >= 0) return { type: 'flock', index: nearestFlock, item: this.level.flockStarts[nearestFlock] };
    if (this.level.playerStart && Math.hypot(this.level.playerStart.x - point.x, this.level.playerStart.y - point.y) < 35) return { type: 'player', index: -1, item: this.level.playerStart };
    if (this.tool === 'pasture') return this.contains(this.level.target, point) ? { type: 'target', index: -1, item: this.level.target } : null;
    if (this.tool === 'gate') { const index = this.level.gates.findIndex((gate) => this.contains(gate, point)); return index >= 0 ? { type: 'gate', index, item: this.level.gates[index] } : null; }
    if (CIRCLE_OBSTACLE_KINDS.has(this.tool) || this.tool === 'fence' || this.tool === 'rock') { const index = this.level.obstacles.findIndex((obstacle) => this.contains(obstacle, point)); return index >= 0 ? { type: 'obstacle', index, item: this.level.obstacles[index] } : null; }
    return null;
  }
  activatePendingMove() {
    if (!this.pendingMove) return;
    this.dragMove = { ...this.pendingMove, moved: false };
    this.pendingMove = null;
    this.moveHoldTimer = null;
    this.dragStart = null;
    this.preview = null;
    this.render();
  }
  movableCenter(movable) { const item = movable.item; if (item.width !== undefined) return { x: item.x + item.width / 2, y: item.y + item.height / 2 }; return { x: item.x, y: item.y }; }
  animatePendingMove() { if (!this.pendingMove) { this.render(); return; } this.render(); requestAnimationFrame(() => this.animatePendingMove()); }
  drawHoldIndicator(center, fraction) { const ctx = this.ctx; const radius = 30; ctx.save(); ctx.strokeStyle = 'rgba(216,239,114,.35)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(center.x, center.y, radius, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = '#d8ef72'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(center.x, center.y, radius, -Math.PI / 2, -Math.PI / 2 + fraction * Math.PI * 2); ctx.stroke(); ctx.restore(); }
  pointerDown(event) { const point = this.pointerPosition(event); const movable = this.tool !== 'erase' ? this.findMovable(point) : null; this.pendingMove = movable ? { ...movable, originX: movable.item.x, originY: movable.item.y, pointerStart: point, startTime: performance.now() } : null; if (this.pendingMove) { this.moveHoldTimer = setTimeout(() => this.activatePendingMove(), MOVE_HOLD_DELAY); this.animatePendingMove(); } if (!movable) { if (this.tool === 'flock') { const existingIndex = this.level.flockStarts.findIndex((start) => Math.hypot(start.x - point.x, start.y - point.y) < 22); if (existingIndex >= 0) { this.openFlockModal(existingIndex); return; } this.level.flockStarts.push(point); this.render(); this.openFlockModal(this.level.flockStarts.length - 1); return; } if (this.tool === 'player') { this.level.playerStart = point; this.render(); return; } if (this.tool === 'erase') { this.removeAt(point); return; } } this.dragStart = point; }
  pointerMove(event) { const point = this.pointerPosition(event); if (this.pendingMove && (point.x !== this.pendingMove.pointerStart.x || point.y !== this.pendingMove.pointerStart.y)) { clearTimeout(this.moveHoldTimer); this.moveHoldTimer = null; this.pendingMove = null; } if (this.dragMove) { const deltaX = point.x - this.dragMove.pointerStart.x; const deltaY = point.y - this.dragMove.pointerStart.y; if (deltaX || deltaY) this.dragMove.moved = true; this.dragMove.item.x = this.dragMove.originX + deltaX; this.dragMove.item.y = this.dragMove.originY + deltaY; this.render(); return; } if (!this.dragStart || this.tool === 'flock') return; this.preview = { start: this.dragStart, end: point }; this.render(); }
  pointerUp() { if (this.moveHoldTimer) { clearTimeout(this.moveHoldTimer); this.moveHoldTimer = null; } if (this.dragMove) { const { type, index, moved } = this.dragMove; if (!moved && type === 'flock') this.openFlockModal(index); this.dragMove = null; this.render(); return; } if (this.pendingMove) { const { type, index } = this.pendingMove; this.pendingMove = null; this.dragStart = null; this.preview = null; if (type === 'flock') this.openFlockModal(index); this.render(); return; } if (!this.dragStart || !this.preview) { this.dragStart = null; return; } const item = this.shapeFromPoints(this.preview.start, this.preview.end); if (CIRCLE_OBSTACLE_KINDS.has(this.tool)) { const center = { x: (this.preview.start.x + this.preview.end.x) / 2, y: (this.preview.start.y + this.preview.end.y) / 2 }; const radius = Math.max(20, Math.hypot(this.preview.end.x - this.preview.start.x, this.preview.end.y - this.preview.start.y) / 2); this.level.obstacles.push({ x: center.x, y: center.y, radius, kind: this.tool }); } else if (item.width > 8 && item.height > 8) { if (this.tool === 'pasture') this.level.target = item; else if (this.tool === 'gate') this.level.gates.push({ ...item, label: 'GATE' }); else this.level.obstacles.push({ ...item, kind: this.tool }); } this.dragStart = null; this.preview = null; this.render(); }
  shapeFromPoints(a, b) { if (CIRCLE_OBSTACLE_KINDS.has(this.tool)) { const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; const radius = Math.max(20, Math.hypot(b.x - a.x, b.y - a.y) / 2); return { x: center.x, y: center.y, radius, kind: this.tool }; } const rect = this.rectFromPoints(a, b); const base = { ...rect, kind: this.tool }; if (this.tool !== 'fence' && this.tool !== 'gate') return base; const endExtension = this.tool === 'fence' ? STANDARD_WALL_WIDTH / 2 : 0; if (rect.width >= rect.height) { const centerY = Math.round(((a.y + b.y) / 2) / GRID_SIZE) * GRID_SIZE; return { x: rect.x - endExtension, y: centerY - STANDARD_WALL_WIDTH / 2, width: rect.width + endExtension * 2, height: STANDARD_WALL_WIDTH, kind: this.tool }; } const centerX = Math.round(((a.x + b.x) / 2) / GRID_SIZE) * GRID_SIZE; return { x: centerX - STANDARD_WALL_WIDTH / 2, y: rect.y - endExtension, width: STANDARD_WALL_WIDTH, height: rect.height + endExtension * 2, kind: this.tool }; }
  rectFromPoints(a, b) { return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) }; }
  contains(item, point) { if (item.radius) return Math.hypot(point.x - item.x, point.y - item.y) <= item.radius; return point.x >= item.x && point.x <= item.x + item.width && point.y >= item.y && point.y <= item.y + item.height; }
  removeAt(point) {
    const gateIndex = this.level.gates.findIndex((gate) => this.contains(gate, point));
    if (gateIndex >= 0) { this.level.gates.splice(gateIndex, 1); this.render(); return; }
    const obstacleIndex = this.level.obstacles.findIndex((obstacle) => this.contains(obstacle, point));
    if (obstacleIndex >= 0) { this.level.obstacles.splice(obstacleIndex, 1); this.render(); return; }
    if (this.contains(this.level.target, point)) { this.level.target = { x: -10000, y: -10000, width: 1, height: 1 }; this.render(); return; }
    if (this.level.playerStart && Math.hypot(this.level.playerStart.x - point.x, this.level.playerStart.y - point.y) < 35) { this.level.playerStart = { x: 80, y: 80 }; this.render(); return; }
    let nearest = -1; let nearestDistance = 35;
    this.level.flockStarts.forEach((start, index) => { const distance = Math.hypot(start.x - point.x, start.y - point.y); if (distance < nearestDistance) { nearest = index; nearestDistance = distance; } });
    if (nearest >= 0) { this.level.flockStarts.splice(nearest, 1); this.render(); }
  }
  clear() { this.level.obstacles = []; this.level.gates = []; this.level.flockStarts = []; this.level.target = { x: 1180, y: 230, width: 300, height: 430 }; this.render(); }
  openFlockModal(index) {
    this.flockModalIndex = index;
    const counts = this.level.flockStarts[index].sheepCounts || {};
    SHEEP_TYPE_ORDER.forEach((type) => { document.getElementById(`flockModalCount-${type}`).value = counts[type] || 0; });
    document.getElementById('flockModalTitle').textContent = `Flock ${index + 1} composition`;
    document.getElementById('flockCompositionModal').hidden = false;
  }
  closeFlockModal() { document.getElementById('flockCompositionModal').hidden = true; this.flockModalIndex = null; }
  saveFlockModal() {
    if (this.flockModalIndex === null || !this.level.flockStarts[this.flockModalIndex]) return this.closeFlockModal();
    const counts = Object.fromEntries(SHEEP_TYPE_ORDER.map((type) => [type, Number(document.getElementById(`flockModalCount-${type}`).value) || 0]));
    const hasAny = Object.values(counts).some((count) => count > 0);
    this.level.flockStarts[this.flockModalIndex].sheepCounts = hasAny ? counts : undefined;
    this.closeFlockModal();
    this.render();
  }
  deleteFlockModal() {
    if (this.flockModalIndex === null) return this.closeFlockModal();
    this.level.flockStarts.splice(this.flockModalIndex, 1);
    this.closeFlockModal();
    this.render();
  }
  bindControls() {
    document.querySelectorAll('[data-editor-tool]').forEach((button) => button.addEventListener('click', () => this.setTool(button.dataset.editorTool)));
    document.getElementById('editorClear').addEventListener('click', () => this.clear());
    document.getElementById('editorClose').addEventListener('click', () => document.getElementById('editorPanel').hidden = true);
    document.getElementById('editorExport').addEventListener('click', () => this.exportCode());
    document.getElementById('editorExportJs').addEventListener('click', () => this.exportJsEntry());
    document.getElementById('editorImport').addEventListener('click', () => this.importCode());
    document.getElementById('editorLoad').addEventListener('click', () => this.load());
    document.getElementById('editorZoomOut').addEventListener('click', () => this.setZoom(this.zoom - 0.25));
    document.getElementById('editorZoomIn').addEventListener('click', () => this.setZoom(this.zoom + 0.25));
    document.getElementById('flockModalSave').addEventListener('click', () => this.saveFlockModal());
    document.getElementById('flockModalDelete').addEventListener('click', () => this.deleteFlockModal());
    document.getElementById('flockModalCancel').addEventListener('click', () => this.closeFlockModal());
    this.setZoom(this.zoom);
  }
  readMetadata() { this.level.title = document.getElementById('editorTitle').value || 'CUSTOM FIELD'; this.level.name = document.getElementById('editorDescription').value || 'My level'; this.level.timeLimit = Number(document.getElementById('editorTime').value) || 600; ['green','yellow','orange','red','lightBlue','blue'].forEach((type) => { this.level.sheepCounts[type] = Number(document.getElementById(`editorCount-${type}`).value) || 0; }); }
  writeMetadata() { document.getElementById('editorTitle').value = this.level.title; document.getElementById('editorDescription').value = this.level.name; document.getElementById('editorTime').value = this.level.timeLimit; Object.entries(this.level.sheepCounts).forEach(([type, count]) => { document.getElementById(`editorCount-${type}`).value = count; }); }
  startNewLevel() { this.level = this.blankLevel(); this.editingId = null; this.writeMetadata(); this.render(); document.getElementById('editorLoad').textContent = 'Add to menu'; }
  startEditing(levelId, level) { this.level = JSON.parse(JSON.stringify(level)); this.editingId = levelId; this.writeMetadata(); this.render(); document.getElementById('editorLoad').textContent = 'Save changes'; }
  compactData() { const countOrder = SHEEP_TYPE_ORDER; const counts = countOrder.map((type) => this.level.sheepCounts[type] || 0); const compact = { t: this.level.title, d: this.level.name, m: this.level.timeLimit, w: [this.level.world.width, this.level.world.height], p: [this.level.playerStart.x, this.level.playerStart.y], f: this.level.flockStarts.map((point) => point.sheepCounts ? [point.x, point.y, ...countOrder.map((type) => point.sheepCounts[type] || 0)] : [point.x, point.y]), z: [this.level.target.x, this.level.target.y, this.level.target.width, this.level.target.height] }; if (counts.some((count) => count > 0)) compact.s = counts; if (this.level.obstacles.length) compact.o = this.level.obstacles.map((shape) => { if (shape.radius) return [shape.x, shape.y, shape.radius, 0, shape.kind === 'water' ? 2 : 3]; return [shape.x, shape.y, shape.width, shape.height, shape.kind === 'rock' ? 1 : 0]; }); if (this.level.gates.length) compact.g = this.level.gates.map((gate) => [gate.x, gate.y, gate.width, gate.height, gate.label]); return compact; }
  exportCode() { this.readMetadata(); const code = `L(${JSON.stringify(this.compactData())})`; document.getElementById('editorCode').value = code; navigator.clipboard?.writeText(code).catch(() => {}); document.getElementById('editorStatus').textContent = 'Compact level code copied.'; }
  exportJsEntry() { this.readMetadata(); const id = (this.level.title || 'customLevel').replace(/[^a-zA-Z0-9]+(.)/g, (_, character) => character.toUpperCase()).replace(/[^a-zA-Z0-9]/g, '') || 'customLevel'; const code = `CUSTOM_LEVELS.${id}=L(${JSON.stringify(this.compactData())});`; document.getElementById('editorCode').value = code; navigator.clipboard?.writeText(code).catch(() => {}); document.getElementById('editorStatus').textContent = 'Paste this one line anywhere after CUSTOM_LEVELS is declared.'; }
  importCode() { try { const source = document.getElementById('editorCode').value.trim(); const compactStart = source.indexOf('L('); const parsed = compactStart >= 0 ? JSON.parse(source.slice(compactStart + 2, source.lastIndexOf(')'))) : JSON.parse(source); this.level = compactStart >= 0 ? { ...this.blankLevel(), ...this.decodeCompact(parsed) } : { ...this.blankLevel(), ...parsed }; this.writeMetadata(); this.render(); } catch (error) { document.getElementById('editorStatus').textContent = `Import error: ${error.message}`; } }
  decodeCompact(data) { const kindNames = SHEEP_TYPE_ORDER; return { title: data.t, name: data.d, timeLimit: data.m, world: { width: data.w[0], height: data.w[1] }, playerStart: { x: data.p[0], y: data.p[1] }, flockStarts: (data.f || []).map((point) => point.length > 2 ? { x: point[0], y: point[1], sheepCounts: Object.fromEntries(kindNames.map((type, index) => [type, point[2 + index] || 0])) } : { x: point[0], y: point[1] }), target: { x: data.z[0], y: data.z[1], width: data.z[2], height: data.z[3] }, sheepCounts: Object.fromEntries(kindNames.map((type, index) => [type, data.s?.[index] || 0])), obstacles: (data.o || []).map((shape) => { const kindCode = shape[4]; if (shape.length >= 5 && shape[3] === 0 && (kindCode === 2 || kindCode === 3)) return { x: shape[0], y: shape[1], radius: shape[2], kind: kindCode === 2 ? 'water' : 'bush' }; return { x: shape[0], y: shape[1], width: shape[2], height: shape[3], kind: kindCode === 1 ? 'rock' : 'fence' }; }), gates: (data.g || []).map((gate) => ({ x: gate[0], y: gate[1], width: gate[2], height: gate[3], label: gate[4] || 'GATE' })) }; }
  load() { this.readMetadata(); const id = this.editingId || this.level.id || `custom-${Date.now()}`; this.level.id = id; this.level.custom = true; registerLevel(id, this.level); this.onLoad(id, this.level); document.getElementById('editorStatus').textContent = this.editingId ? 'Changes saved.' : 'Level added to the selection menu.'; }
  render() { const ctx = this.ctx; ctx.clearRect(0, 0, WORLD.width, WORLD.height); ctx.fillStyle = '#294a34'; ctx.fillRect(0, 0, WORLD.width, WORLD.height); ctx.strokeStyle = 'rgba(216,239,114,.045)'; for (let x = 0; x < WORLD.width; x += GRID_SIZE) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD.height); ctx.stroke(); } for (let y = 0; y < WORLD.height; y += GRID_SIZE) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD.width, y); ctx.stroke(); } this.drawRect(this.level.target, 'rgba(216,239,114,.2)', '#d8ef72', 'PASTURE'); this.level.obstacles.forEach((item) => this.drawRect(item, item.kind === 'rock' ? '#51634b' : '#203229', item.kind === 'rock' ? '#718166' : '#d2b877', item.kind.toUpperCase())); this.level.gates.forEach((item) => this.drawRect(item, 'rgba(247,124,98,.18)', '#f77c62', 'GATE')); this.level.flockStarts.forEach((point, index) => { ctx.fillStyle = '#f4f0e5'; ctx.strokeStyle = '#15251e'; ctx.beginPath(); ctx.arc(point.x, point.y, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#15251e'; ctx.font = '12px DM Mono'; ctx.fillText(`FLOCK ${index + 1}`, point.x - 28, point.y - 30); }); if (this.level.playerStart) { ctx.fillStyle = '#f77c62'; ctx.strokeStyle = '#fff0e5'; ctx.beginPath(); ctx.arc(this.level.playerStart.x, this.level.playerStart.y, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff0e5'; ctx.font = '12px DM Mono'; ctx.fillText('PLAYER', this.level.playerStart.x - 25, this.level.playerStart.y - 24); } if (this.preview) this.drawRect(this.shapeFromPoints(this.preview.start, this.preview.end), 'rgba(216,239,114,.12)', '#d8ef72', this.tool.toUpperCase()); }
  render() { const ctx = this.ctx; ctx.clearRect(0, 0, WORLD.width, WORLD.height); ctx.fillStyle = '#294a34'; ctx.fillRect(0, 0, WORLD.width, WORLD.height); ctx.strokeStyle = 'rgba(216,239,114,.045)'; for (let x = 0; x < WORLD.width; x += GRID_SIZE) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD.height); ctx.stroke(); } for (let y = 0; y < WORLD.height; y += GRID_SIZE) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD.width, y); ctx.stroke(); } this.drawRect(this.level.target, 'rgba(216,239,114,.2)', '#d8ef72', 'PASTURE'); this.level.gates.forEach((item) => this.drawRect(item, 'rgba(247,124,98,.18)', '#f77c62', 'GATE')); this.level.obstacles.forEach((item) => this.drawObstacle(item)); this.level.flockStarts.forEach((point, index) => { ctx.fillStyle = '#f4f0e5'; ctx.strokeStyle = '#15251e'; ctx.beginPath(); ctx.arc(point.x, point.y, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#15251e'; ctx.font = '12px DM Mono'; ctx.fillText(`FLOCK ${index + 1}`, point.x - 28, point.y - 30); ctx.fillText(this.flockSummary(point), point.x - 28, point.y + 38); }); if (this.level.playerStart) { ctx.fillStyle = '#f77c62'; ctx.strokeStyle = '#fff0e5'; ctx.beginPath(); ctx.arc(this.level.playerStart.x, this.level.playerStart.y, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff0e5'; ctx.font = '12px DM Mono'; ctx.fillText('PLAYER', this.level.playerStart.x - 25, this.level.playerStart.y - 24); } if (this.preview) this.drawObstacle(this.shapeFromPoints(this.preview.start, this.preview.end)); if (this.pendingMove) this.drawHoldIndicator(this.movableCenter(this.pendingMove), Math.min(1, (performance.now() - this.pendingMove.startTime) / MOVE_HOLD_DELAY)); }
  flockSummary(point) { if (!point.sheepCounts) return 'shared counts'; const total = SHEEP_TYPE_ORDER.reduce((sum, type) => sum + (point.sheepCounts[type] || 0), 0); return `${total} sheep`; }
  drawObstacle(item) { const ctx = this.ctx; const kind = item.kind || 'fence'; if (item.radius) { const fill = kind === 'water' ? '#1b4e7c' : '#305d2b'; const stroke = kind === 'water' ? '#7bd3ff' : '#9cda71'; ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = stroke; ctx.font = '12px DM Mono'; ctx.fillText(kind.toUpperCase(), item.x - Math.max(20, kind.length * 5), item.y - item.radius - 12); return; } const fill = kind === 'rock' ? '#51634b' : '#203229'; const stroke = kind === 'rock' ? '#718166' : '#d2b877'; if (kind === 'rock') { ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(item.x, item.y, item.width, item.height, 18); ctx.fill(); ctx.stroke(); ctx.fillStyle = stroke; ctx.font = '12px DM Mono'; ctx.fillText(kind.toUpperCase(), item.x + 8, item.y + 18); return; } this.drawRect(item, fill, stroke, kind.toUpperCase()); }
  drawRect(item, fill, stroke, label) { const ctx = this.ctx; ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.fillRect(item.x, item.y, item.width, item.height); ctx.strokeRect(item.x, item.y, item.width, item.height); ctx.fillStyle = stroke; ctx.font = '12px DM Mono'; ctx.fillText(label, item.x + 8, item.y + 18); }
}
