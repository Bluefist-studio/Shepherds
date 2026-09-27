const FADE_DURATION = 1.2; // seconds
const SHORT_SHEEP_MIN_DELAY = 8000; // ms
const SHORT_SHEEP_MAX_DELAY = 18000; // ms

function createAudio(file, { loop = false, volume = 1 } = {}) {
  const audio = new Audio(`sound/${file}`);
  audio.loop = loop;
  audio.baseVolume = volume;
  audio.volume = volume;
  return audio;
}

// Manages menu/level music crossfades, ambient loops, periodic sheep chatter and one-shot sfx.
export class AudioManager {
  constructor() {
    this.menuMusic = createAudio('menumusic.mp3', { loop: true, volume: 0.1 });
    this.levelMusic = createAudio('levelmusic.mp3', { loop: true, volume: 0.1 });
    this.birdLoop = createAudio('birdloop.mp3', { loop: true, volume: 0.6 });
    this.sheepLoop = createAudio('sheeploop.mp3', { loop: true, volume: 1 });
    this.shortSheepSounds = ['shortsheep1.mp3', 'shortsheep2.mp3', 'shortsheep3.mp3'].map((file) => createAudio(file, { volume: 0.7 }));
    this.dogBark = createAudio('dogbark2.mp3', { volume: 0.8 });
    this.levelEnd = createAudio('levelend.mp3', { loop: true, volume: 0.6 });
    this.victory = createAudio('victory.mp3', { volume: 0.6 });
    this.dogPanting = createAudio('dogpanting.mp3', { loop: true, volume: 1 });
    this.lowStamina = false;
    this.state = null;
    this.fadeIntervals = new WeakMap();
    this.shortSheepTimer = null;
    this.unlocked = false;
    // Ambient loops autoplay muted at load and get unmuted+resumed on unlock; on-demand loops only get unmuted, never auto-started.
    this.loops = [this.menuMusic, this.levelMusic, this.birdLoop, this.sheepLoop];
    this.onDemandLoops = [this.levelEnd, this.dogPanting];
    this.watchForUnlock();
  }

  // Muted autoplay is always allowed; unmute once a real user gesture arrives so playback never waits on a blocked play() retry.
  watchForUnlock() {
    const unlock = () => {
      if (this.unlocked) return;
      this.unlocked = true;
      this.loops.forEach((audio) => { audio.muted = false; if (audio.paused && audio.volume > 0) audio.play().catch(() => {}); });
      this.onDemandLoops.forEach((audio) => { audio.muted = false; });
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);
  }

  fadeTo(audio, targetVolume, duration = FADE_DURATION) {
    clearInterval(this.fadeIntervals.get(audio));
    if (targetVolume > 0 && audio.paused) { audio.muted = !this.unlocked; audio.play().catch(() => {}); }
    const startVolume = audio.volume;
    const startTime = performance.now();
    const interval = setInterval(() => {
      const progress = Math.min(1, (performance.now() - startTime) / (duration * 1000));
      audio.volume = startVolume + (targetVolume - startVolume) * progress;
      if (progress >= 1) {
        clearInterval(this.fadeIntervals.get(audio));
        if (targetVolume === 0) audio.pause();
      }
    }, 50);
    this.fadeIntervals.set(audio, interval);
  }

  fadeIn(audio, duration) { this.fadeTo(audio, audio.baseVolume, duration); }
  fadeOut(audio, duration) { this.fadeTo(audio, 0, duration); }

  playMenu() {
    if (this.state === 'menu') return;
    this.state = 'menu';
    this.stopShortSheepChatter();
    this.stopLevelEnd();
    this.setLowStamina(false);
    this.fadeOut(this.levelMusic);
    this.fadeOut(this.birdLoop);
    this.fadeOut(this.sheepLoop);
    this.fadeIn(this.menuMusic);
  }

  // Editor has no music, just the ambient bird/sheep loops while drawing a field.
  playEditor() {
    if (this.state === 'editor') return;
    this.state = 'editor';
    this.stopShortSheepChatter();
    this.stopLevelEnd();
    this.setLowStamina(false);
    this.fadeOut(this.menuMusic);
    this.fadeOut(this.levelMusic);
    this.fadeIn(this.birdLoop);
    this.fadeIn(this.sheepLoop);
  }

  playLevel() {
    if (this.state === 'level') return;
    this.state = 'level';
    this.stopLevelEnd();
    this.fadeOut(this.menuMusic);
    this.fadeIn(this.levelMusic);
    this.fadeIn(this.birdLoop);
    this.fadeIn(this.sheepLoop);
    this.scheduleShortSheepChatter();
  }

  // Fades dogpanting.mp3 in/out as the dog's stamina crosses the low-stamina threshold.
  setLowStamina(isLow) {
    if (this.lowStamina === isLow) return;
    this.lowStamina = isLow;
    if (isLow) this.fadeIn(this.dogPanting, 0.4);
    else this.fadeOut(this.dogPanting, 0.4);
  }

  // Plays until stopLevelEnd() runs (return to menu or reset); victory.mp3 layers on top for a successful finish.
  playLevelEnd(success) {
    this.levelEnd.currentTime = 0;
    this.levelEnd.muted = !this.unlocked;
    this.levelEnd.play().catch(() => {});
    if (!success) return;
    this.victory.currentTime = 0;
    this.victory.muted = !this.unlocked;
    this.victory.play().catch(() => {});
  }

  stopLevelEnd() {
    this.levelEnd.pause(); this.levelEnd.currentTime = 0;
    this.victory.pause(); this.victory.currentTime = 0;
  }

  scheduleShortSheepChatter() {
    clearTimeout(this.shortSheepTimer);
    const delay = SHORT_SHEEP_MIN_DELAY + Math.random() * (SHORT_SHEEP_MAX_DELAY - SHORT_SHEEP_MIN_DELAY);
    this.shortSheepTimer = setTimeout(() => {
      if (this.state !== 'level') return;
      const sound = this.shortSheepSounds[Math.floor(Math.random() * this.shortSheepSounds.length)];
      sound.currentTime = 0;
      sound.play().catch(() => {});
      this.scheduleShortSheepChatter();
    }, delay);
  }

  stopShortSheepChatter() { clearTimeout(this.shortSheepTimer); this.shortSheepTimer = null; }

  bark() { this.dogBark.currentTime = 0; this.dogBark.play().catch(() => {}); }
}
