import { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint, Events, Body, Query, Vector } from 'matter-js';

// --- Web Audio API 기반 절차적 사운드 매니저 ---
class SoundManager {
  private ctx: AudioContext | null = null;
  public muted: boolean = false; 
  private scale = [1, 1.125, 1.25, 1.5, 1.667, 2];

  init() {
    if (this.ctx && this.ctx.state === 'running') return;
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch (e) {}
  }

  playPopSound(impact: number, pitchMultiplier: number = 1, size: number = 60) {
    if (this.muted) return;
    this.init(); 
    if (!this.ctx || this.ctx.state !== 'running') return;

    const vol = Math.min(impact * 0.009, 0.108); 
    if (vol < 0.009) return;

    const now = this.ctx.currentTime;
    const isLarge = size > 85;

    if (isLarge) {
      // --- '철퍽' 하는 무거운 젤리 사운드 (Large Size) ---
      const baseFreq = 110 * pitchMultiplier; // 낮은 베이스 주파수 (A2)
      const osc = this.ctx.createOscillator();
      const mod = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();
      const gain = this.ctx.createGain();
      osc.type = 'sine'; mod.type = 'sine';
      mod.frequency.setValueAtTime(40, now);
      modGain.gain.setValueAtTime(baseFreq * 0.5, now);
      modGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, now + 0.2);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(vol * 1.5, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      mod.connect(modGain); modGain.connect(osc.frequency); osc.connect(gain);
      gain.connect(this.ctx.destination);
      mod.start(now); osc.start(now); mod.stop(now + 0.25); osc.stop(now + 0.25);

      // '철퍽' 노이즈
      const bufferSize = this.ctx.sampleRate * 0.1;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource(); noise.buffer = buffer;
      const noiseFilter = this.ctx.createBiquadFilter(); noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(1000, now); noiseFilter.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      const noiseGain = this.ctx.createGain(); noiseGain.gain.setValueAtTime(vol * 0.5, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(this.ctx.destination);
      noise.start(now);
    } else {
      // --- '포용' 하는 가벼운 푸딩 사운드 (Small Size) ---
      const baseFreq = 392.00 * pitchMultiplier;
      const noteRatio = this.scale[Math.floor(Math.random() * this.scale.length)];
      const freq = baseFreq * noteRatio * (Math.random() > 0.8 ? 2 : 1);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const duration = 0.08 + Math.random() * 0.04; 
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 0.8, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.4, now + 0.01);
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.04);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + duration);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(vol * 0.8, now + 0.01); 
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + duration);

      const click = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      click.type = 'triangle'; click.frequency.setValueAtTime(freq * 3, now);
      clickGain.gain.setValueAtTime(vol * 0.2, now); clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
      click.connect(clickGain); clickGain.connect(this.ctx.destination);
      click.start(now); click.stop(now + 0.015);
    }
  }

  playMergeSound() {
    if (this.muted) return;
    this.playPopSound(25, 0.5, 120);
    setTimeout(() => this.playPopSound(30, 0.75, 100), 50);
  }
}

export const soundManager = new SoundManager();

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
  type?: 'heart' | 'circle' | 'star' | 'pop';
}

interface TrailPoint {
  x: number; y: number; angle: number; scaleX: number; scaleY: number;
}

export interface JellyBody extends Body {
  customText: string; customColor: string; customSize: number;
  isEmoji: boolean; mergeLevel: number; cacheCanvas?: HTMLCanvasElement;
  stickyTarget?: Body | null; stickyStartTime?: number;
  trail: TrailPoint[];
  fontName: string;
}

export interface PhysicsConfig {
  gravityX: number; gravityY: number; restitution: number;
  friction: number; airResistance: number;
}

export class PhysicsEngine {
  public engine: Engine; public world: Matter.World; public render: Render;
  public runner: Runner; public mouse: Mouse; public mouseConstraint: MouseConstraint;
  
  private ground!: Body; private leftWall!: Body; private rightWall!: Body; private ceiling!: Body;
  public textBodies: JellyBody[] = []; public MAX_BODIES = 400;
  private particles: Particle[] = []; public magnetMode: boolean = false;
  public lockedMagnetPosition: Vector | null = null;
  private mergeQueue: { a: JellyBody, b: JellyBody }[] = [];
  public currentFont: string = "'Titan One'";

  public config: PhysicsConfig = {
    gravityX: 0, gravityY: 1, restitution: 0.6, friction: 0.1, airResistance: 0.01
  };

  private cacheMap: Map<string, HTMLCanvasElement> = new Map();
  private pressStartTime: number = 0; private pressTimer: any = null;
  private activeBody: Body | null = null;

  constructor(container: HTMLElement) {
    this.engine = Engine.create({ enableSleeping: true });
    this.world = this.engine.world;
    this.render = Render.create({
      element: container, engine: this.engine,
      options: {
        width: container.clientWidth || window.innerWidth,
        height: container.clientHeight || window.innerHeight,
        wireframes: false, background: "transparent", 
        pixelRatio: window.devicePixelRatio || 1 
      },
    });
    this.mouse = Mouse.create(this.render.canvas);
    this.mouseConstraint = MouseConstraint.create(this.engine, {
      mouse: this.mouse, constraint: { stiffness: 0.2, render: { visible: false } } as any,
    });
    (this.mouseConstraint as any).enabled = false;
    this.render.mouse = this.mouse;
    Composite.add(this.world, this.mouseConstraint);
    this.createWalls(this.render.options.width!, this.render.options.height!);
    this.setupEvents();
    this.runner = Runner.create();
    Render.run(this.render); Runner.run(this.runner, this.engine);
  }

  private getScaleFactor() {
    const minDim = Math.min(window.innerWidth, window.innerHeight);
    return Math.max(0.5, Math.min(1.5, minDim / 1000));
  }

  private getCacheCanvas(char: string, size: number, color: string, isEmoji: boolean, font: string): HTMLCanvasElement {
    const key = `${char}-${size}-${color}-${isEmoji}-${font}`;
    if (this.cacheMap.has(key)) return this.cacheMap.get(key)!;
    const canvas = document.createElement('canvas');
    const padding = 40; canvas.width = size + padding; canvas.height = size + padding;
    const ctx = canvas.getContext('2d')!; const center = canvas.width / 2;
    if (isEmoji) {
      ctx.font = `${size}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.1)"; ctx.shadowBlur = 10; ctx.fillText(char, center, center);
    } else {
      ctx.font = `bold ${size}px ${font}, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 12; ctx.fillStyle = color; ctx.fillText(char, center, center); ctx.restore();
      ctx.save(); ctx.fillText(char, center, center); ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = 0.85; ctx.fillStyle = color; ctx.fillRect(0, 0, canvas.width, canvas.height);
      const shineGrad = ctx.createLinearGradient(0, center - size/2, 0, center);
      shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)'); shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = shineGrad; ctx.fillRect(0, 0, canvas.width, center);
      const shadowGrad = ctx.createLinearGradient(0, center, 0, center + size/2);
      shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0)'); shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
      ctx.fillStyle = shadowGrad; ctx.fillRect(0, center, canvas.width, canvas.height); ctx.restore();
    }
    this.cacheMap.set(key, canvas); return canvas;
  }

  private spawnParticles(x: number, y: number, color: string, count: number = 8, type: 'heart' | 'circle' | 'star' | 'pop' = 'circle') {
    const scale = this.getScaleFactor();
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (type === 'pop' ? Math.random() * 8 + 4 : Math.random() * 4 + 2) * scale;
      this.particles.push({ 
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, 
        life: 1.0, maxLife: (type === 'pop' ? 0.03 : 0.015) + Math.random() * 0.02, 
        color, size: (type === 'pop' ? Math.random() * 12 + 6 : Math.random() * 8 + 4) * scale, type 
      });
    }
  }

  public createWalls(width: number, height: number) {
    if (this.ground) Composite.remove(this.world, [this.ground, this.leftWall, this.rightWall, this.ceiling]);
    const thick = 100; const wallOptions = { isStatic: true, restitution: 0.2, friction: 0.8, render: { visible: false } };
    this.ground = Bodies.rectangle(width / 2, height + thick / 2, width + 400, thick, wallOptions);
    this.ceiling = Bodies.rectangle(width / 2, -thick / 2, width + 400, thick, wallOptions);
    this.leftWall = Bodies.rectangle(-thick / 2, height / 2, thick, height + 400, wallOptions);
    this.rightWall = Bodies.rectangle(width + thick / 2, height / 2, thick, height + 400, wallOptions);
    Composite.add(this.world, [this.ground, this.leftWall, this.rightWall, this.ceiling]);
  }

  private setupEvents() {
    Events.on(this.engine, 'beforeUpdate', () => {
      const now = Date.now();
      const scale = this.getScaleFactor();
      this.textBodies.forEach(body => {
        const target = this.lockedMagnetPosition || (this.mouse.position.x !== 0 ? this.mouse.position : null);
        if (this.magnetMode && target) {
          const dx = target.x - body.position.x; const dy = target.y - body.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > 1) {
            const forceStrength = Math.min(distance * 0.0004 * scale, 0.01 * scale);
            Body.applyForce(body, body.position, { x: (dx / distance) * forceStrength * body.mass, y: (dy / distance) * forceStrength * body.mass });
            const stickyFactor = distance < 150 * scale ? 0.85 : 0.95;
            Body.setVelocity(body, { x: body.velocity.x * stickyFactor, y: body.velocity.y * stickyFactor });
          }
        }
        
        const speed = Vector.magnitude(body.velocity);
        if (speed > 8) {
          body.trail.unshift({ x: body.position.x, y: body.position.y, angle: body.angle, scaleX: 1 + (speed * 0.012), scaleY: 1 / (1 + (speed * 0.012)) });
          if (body.trail.length > 2) body.trail.pop();
        } else body.trail = [];

        if (body.stickyTarget && body.stickyStartTime) {
          if (now - body.stickyStartTime < 800) { Body.setVelocity(body, { x: body.velocity.x * 0.9, y: Math.min(body.velocity.y, 0.5) }); }
          else { body.stickyTarget = null; body.stickyStartTime = 0; }
        }
      });
    });
    Events.on(this.engine, 'afterUpdate', () => { if (this.mergeQueue.length > 0) this.processMergeQueue(); });
    Events.on(this.engine, 'collisionStart', (event: any) => {
      event.pairs.forEach((pair: any) => {
        const bodyA = pair.bodyA as JellyBody; const bodyB = pair.bodyB as JellyBody;
        const isAWall = [this.ground, this.leftWall, this.rightWall, this.ceiling].includes(bodyA);
        const isBWall = [this.ground, this.leftWall, this.rightWall, this.ceiling].includes(bodyB);
        if (!isAWall && isBWall) { bodyA.stickyTarget = bodyB; bodyA.stickyStartTime = Date.now(); }
        else if (isAWall && !isBWall) { bodyB.stickyTarget = bodyA; bodyB.stickyStartTime = Date.now(); }
        if (bodyA.customText && bodyB.customText) {
          if (bodyA.customText === bodyB.customText && bodyA.mergeLevel === bodyB.mergeLevel && bodyA.mergeLevel < 3) {
            const alreadyInQueue = this.mergeQueue.some(m => m.a === bodyA || m.a === bodyB || m.b === bodyA || m.b === bodyB);
            if (!alreadyInQueue) this.mergeQueue.push({ a: bodyA, b: bodyB });
          }
        }
        const speedA = Vector.magnitude(pair.bodyA.velocity); const speedB = Vector.magnitude(pair.bodyB.velocity);
        const impact = speedA + speedB;
        if (impact > 1.5) {
          // 튕겨질 때 소리를 20% 줄임
          soundManager.playPopSound(impact * 0.8);
          const pos = pair.collision.supports[0] || pair.bodyA.position;
          const color = (pair.bodyA as JellyBody).customColor || (pair.bodyB as JellyBody).customColor || "#fff";
          if (impact > 6) this.spawnParticles(pos.x, pos.y, color, 3);
        }
      });
    });
    Events.on(this.mouseConstraint, 'mousedown', (event: any) => {
      const foundBodies = Query.point(this.textBodies, event.mouse.position);
      this.pressStartTime = Date.now();
      if (foundBodies.length > 0) { this.activeBody = foundBodies[0]; this.pressTimer = setTimeout(() => { if (this.activeBody) (this.mouseConstraint as any).enabled = true; }, 2000); }
    });
    Events.on(this.mouseConstraint, 'mouseup', (event: any) => {
      clearTimeout(this.pressTimer); const duration = Date.now() - this.pressStartTime;
      if (duration < 2000 && !this.magnetMode) this.applyBlast(event.mouse.position);
      (this.mouseConstraint as any).enabled = false; this.activeBody = null;
    });
    Events.on(this.render, "afterRender", () => {
      const ctx = this.render.context;
      this.textBodies.forEach(b => {
        if (!b.cacheCanvas) return;
        
        b.trail.forEach((point, i) => {
          const alpha = 0.15 * (1 - i / b.trail.length);
          ctx.save(); ctx.globalAlpha = alpha; ctx.translate(point.x, point.y); ctx.rotate(point.angle);
          const velAngle = Math.atan2(b.velocity.y, b.velocity.x) - point.angle; ctx.rotate(velAngle); ctx.scale(point.scaleX, point.scaleY); ctx.rotate(-velAngle);
          ctx.drawImage(b.cacheCanvas!, -b.cacheCanvas!.width / 2, -b.cacheCanvas!.height / 2); ctx.restore();
        });

        ctx.save(); ctx.translate(b.position.x, b.position.y); ctx.rotate(b.angle);
        const speed = Vector.magnitude(b.velocity);
        if (speed > 1) {
            const velAngle = Math.atan2(b.velocity.y, b.velocity.x) - b.angle; const stretch = 1 + (speed * 0.012); const squash = 1 / stretch; 
            ctx.rotate(velAngle); ctx.scale(stretch, squash); ctx.rotate(-velAngle);
        }
        ctx.drawImage(b.cacheCanvas, -b.cacheCanvas.width / 2, -b.cacheCanvas.height / 2); ctx.restore();
      });
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life -= p.maxLife;
        if (p.life <= 0) { this.particles.splice(i, 1); continue; }
        ctx.save(); ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
        if (p.type === 'heart') this.drawHeart(ctx, p.x, p.y, p.size * p.life);
        else if (p.type === 'star') this.drawStar(ctx, p.x, p.y, 5, p.size * p.life, (p.size/2) * p.life);
        else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
    });
    window.addEventListener("resize", this.handleResize);
  }

  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.bezierCurveTo(x, y - size/2, x - size, y - size/2, x - size, y);
    ctx.bezierCurveTo(x - size, y + size/2, x, y + size, x, y + size);
    ctx.bezierCurveTo(x, y + size, x + size, y + size/2, x + size, y);
    ctx.bezierCurveTo(x + size, y - size/2, x, y - size/2, x, y); ctx.fill();
  }

  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
    let rot = Math.PI / 2 * 3; let step = Math.PI / spikes; ctx.beginPath(); ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius); rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius); rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius); ctx.closePath(); ctx.fill();
  }

  private processMergeQueue() {
    this.mergeQueue.forEach(({ a, b }) => {
      if (!a || !b) return; if (!this.textBodies.includes(a) || !this.textBodies.includes(b)) return;
      const midX = (a.position.x + b.position.x) / 2; const midY = (a.position.y + b.position.y) / 2;
      const newLevel = a.mergeLevel + 1; const newSize = a.customSize * 1.4;
      this.removeBody(a); this.removeBody(b);
      this.createLetter(a.customText, a.customColor, midX, midY, newLevel, newSize);
      this.spawnParticles(midX, midY, a.customColor, 12, 'star'); soundManager.playMergeSound();
    });
    this.mergeQueue = [];
  }

  private removeBody(body: JellyBody) { Composite.remove(this.world, body); this.textBodies = this.textBodies.filter(b => b !== body); }
  private handleResize = () => {
    const w = window.innerWidth; const h = window.innerHeight;
    this.render.canvas.width = w; this.render.canvas.height = h;
    this.render.options.width = w; this.render.options.height = h;
    this.createWalls(w, h);
  };

  public updateGravity(x: number, y: number) { this.engine.gravity.x = x; this.engine.gravity.y = y; }

  public applyBlast(position: Vector, forceMultiplier: number = 1) {
    const scale = this.getScaleFactor();
    const radius = 300 * forceMultiplier * scale; const forceMagnitude = 0.15 * forceMultiplier;
    this.textBodies.forEach(body => {
      const dx = body.position.x - position.x; const dy = body.position.y - position.y; const distance = Math.sqrt(dx*dx + dy*dy);
      if (distance < radius && distance > 0) {
        const strength = (1 - distance / radius);
        Body.applyForce(body, body.position, { x: (dx / distance) * forceMagnitude * body.mass * strength, y: ((dy / distance) * forceMagnitude - 0.05) * body.mass * strength });
        if (distance < 60 * scale) this.spawnParticles(body.position.x, body.position.y, body.customColor, 5);
      }
    });
  }

  // RAIN 시 색상을 받도록 수정
  public triggerRain(getColor: () => string) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for (let i = 0; i < 40; i++) { 
      setTimeout(() => { 
        const char = Array.from(chars)[Math.floor(Math.random() * Array.from(chars).length)]; 
        this.createLetter(char, getColor()); 
      }, i * 40); 
    }
  }

  public triggerBomb() {
    const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.applyBlast(center, 3); this.spawnParticles(center.x, center.y, "#ff5500", 30); this.spawnParticles(center.x, center.y, "#ffff00", 20);
  }

  public triggerLove() {
    this.textBodies.forEach(b => {
      b.customColor = "#ff6b81"; b.cacheCanvas = this.getCacheCanvas(b.customText, b.customSize, b.customColor, b.isEmoji, b.fontName);
      this.spawnParticles(b.position.x, b.position.y, "#ffafbd", 3, 'heart');
    });
  }

  public updateConfig(newConfig: Partial<PhysicsConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.gravityX !== undefined) this.engine.gravity.x = this.config.gravityX;
    if (newConfig.gravityY !== undefined) this.engine.gravity.y = this.config.gravityY;
    this.textBodies.forEach(b => { if (newConfig.restitution !== undefined) b.restitution = newConfig.restitution; if (newConfig.friction !== undefined) b.friction = newConfig.friction; if (newConfig.airResistance !== undefined) b.frictionAir = newConfig.airResistance; });
  }

  public removeLastWithExplosion() {
    const body = this.textBodies.pop();
    if (body) {
      this.spawnParticles(body.position.x, body.position.y, body.customColor, 15, 'pop');
      soundManager.playPopSound(20, 1.5);
      Composite.remove(this.world, body);
    }
  }

  // 테마 강제 적용 메서드 추가
  public applyThemeToAll(getColor: () => string) {
    this.textBodies.forEach(b => {
      b.customColor = getColor();
      b.cacheCanvas = this.getCacheCanvas(b.customText, b.customSize, b.customColor, b.isEmoji, b.fontName);
    });
  }

  public createLetter(char: string, overrideColor?: string, startX?: number, startY?: number, level: number = 0, overrideSize?: number) {
    if (!char || char.trim() === "") return;
    if (this.textBodies.length >= this.MAX_BODIES) { const oldest = this.textBodies.shift(); if (oldest) Composite.remove(this.world, oldest); }
    const scale = this.getScaleFactor();
    const isEmoji = /\p{Emoji}/u.test(char) && !/[a-zA-Z0-9]/.test(char);
    const x = startX !== undefined ? startX : (window.innerWidth / 2) + (Math.random() - 0.5) * (window.innerWidth * 0.7);
    const y = startY !== undefined ? startY : 100; 
    const isUppercase = char === char.toUpperCase() && char !== char.toLowerCase();
    const baseSize = isEmoji ? 70 + Math.random() * 30 : (isUppercase ? 85 + Math.random() * 35 : 45 + Math.random() * 20);
    const size = (overrideSize || baseSize) * scale;
    let color = overrideColor; if (!color) color = `hsl(${Math.floor(Math.random() * 360)}, 85%, 60%)`;
    const newBody = Bodies.circle(x, y, size / 2, { restitution: this.config.restitution, friction: 0.5, frictionAir: this.config.airResistance, density: 0.002 * (1 + level * 0.5), slop: 0.5, angle: Math.random() * Math.PI, render: { visible: false }, }) as JellyBody;
    newBody.customText = char; newBody.customColor = color; newBody.customSize = size; newBody.isEmoji = isEmoji; newBody.mergeLevel = level; newBody.fontName = this.currentFont;
    newBody.cacheCanvas = this.getCacheCanvas(char, size, color, isEmoji, this.currentFont);
    newBody.trail = []; this.textBodies.push(newBody); Composite.add(this.world, newBody);
  }

  public applyGlobalForce() { this.textBodies.forEach(b => Body.applyForce(b, b.position, { x: (Math.random()-0.5)*0.05, y: -0.08 * b.mass })); }
  public clearAll() { this.textBodies.forEach(b => Composite.remove(this.world, b)); this.textBodies = []; this.particles = []; this.createWalls(this.render.options.width!, this.render.options.height!); }
  public destroy() { window.removeEventListener("resize", this.handleResize); Render.stop(this.render); Runner.stop(this.runner); Engine.clear(this.engine); this.render.canvas.remove(); }
}
