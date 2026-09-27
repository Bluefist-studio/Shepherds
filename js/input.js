export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouse = { x: canvas.width / 2, y: canvas.height / 2 };
    this.barkQueued = false;
    window.addEventListener('keydown', (event) => {
      const target = event.target;
      const isTextField = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target.isContentEditable;
      if (isTextField) return;
      const key = event.key.toLowerCase();
      this.keys.add(key);
      if (event.code === 'Space' && !event.repeat) this.barkQueued = true;
      if (['w','a','s','d',' ','arrowup','arrowdown','arrowleft','arrowright'].includes(key)) event.preventDefault();
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()));
    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = (event.clientX - rect.left) * canvas.width / rect.width;
      this.mouse.y = (event.clientY - rect.top) * canvas.height / rect.height;
    });
  }
  down(...keys) { return keys.some((key) => this.keys.has(key)); }
  consumeBark() { const queued = this.barkQueued; this.barkQueued = false; return queued; }
}
