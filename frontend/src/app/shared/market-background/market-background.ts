import { AfterViewInit, Component, ElementRef, OnDestroy, viewChild } from '@angular/core';

interface Point {
  x: number;
  y: number;
}

interface Arrow {
  points: Point[];
  segLengths: number[];
  totalLength: number;
  progress: number;
  speed: number;
  state: 'drawing' | 'holding' | 'fading';
  holdUntil: number;
  opacity: number;
}

interface Cloud {
  x: number;
  y: number;
  width: number;
  speed: number;
  lines: number;
}

const MIN_ARROWS = 2;
const MAX_ARROWS = 4;
const TAIL_FRACTION = 0.22;
const HOLD_MS = 450;
const FADE_MS = 550;
const CLOUD_COUNT = 4;
// Matches --color-primary (#3452eb) — canvas can't read CSS custom properties directly.
const ARROW_COLOR = '52, 82, 235';
const CLOUD_COLOR = '90, 98, 115';

// Purely decorative canvas background for the login/signup pages: a handful of
// short-tailed "stock chart" arrows drifting bottom-left -> top-right (growth,
// progress — the point of learning), plus slow dark-gray "cloud" lines drifting
// the opposite way as a calm counter-motion for the eye.
@Component({
  selector: 'app-market-background',
  template: `<canvas #canvas class="market-bg"></canvas>`,
  styleUrl: './market-background.scss',
})
export class MarketBackground implements AfterViewInit, OnDestroy {
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private ctx!: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private arrows: Arrow[] = [];
  private clouds: Cloud[] = [];
  private rafId = 0;
  private lastTime = 0;
  private resizeObserver?: ResizeObserver;

  ngAfterViewInit(): void {
    const canvas = this.canvasRef().nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();

    this.clouds = Array.from({ length: CLOUD_COUNT }, () => this.makeCloud(Math.random() * this.width));
    for (let i = 0; i < MIN_ARROWS; i++) this.arrows.push(this.spawnArrow());

    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
  }

  private resize(): void {
    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    canvas.width = Math.round(this.width * this.dpr);
    canvas.height = Math.round(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private makeCloud(x: number): Cloud {
    return {
      x,
      y: 20 + Math.random() * Math.max(1, this.height - 40),
      width: 70 + Math.random() * 90,
      speed: 0.006 + Math.random() * 0.01,
      lines: 2 + Math.round(Math.random()),
    };
  }

  private spawnArrow(): Arrow {
    const startX = this.width * (Math.random() * 0.12);
    const startY = this.height * (0.7 + Math.random() * 0.25);
    const endX = this.width * (0.78 + Math.random() * 0.2);
    const endY = this.height * (Math.random() * 0.22);

    const segCount = 4 + Math.floor(Math.random() * 4);
    const amplitude = this.height * (0.05 + Math.random() * 0.09);
    const points: Point[] = [];
    for (let i = 0; i <= segCount; i++) {
      const t = i / segCount;
      const baseX = startX + (endX - startX) * t;
      const baseY = startY + (endY - startY) * t;
      const sign = i % 2 === 0 ? -1 : 1;
      const y = i > 0 && i < segCount ? baseY + sign * amplitude * (1 - t * 0.4) : baseY;
      points.push({ x: baseX, y });
    }

    const segLengths: number[] = [];
    let totalLength = 0;
    for (let i = 1; i < points.length; i++) {
      const d = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      segLengths.push(d);
      totalLength += d;
    }

    return {
      points,
      segLengths,
      totalLength,
      progress: 0,
      speed: 0.00015 + Math.random() * 0.00018,
      state: 'drawing',
      holdUntil: 0,
      opacity: 1,
    };
  }

  private pointAtDistance(arrow: Arrow, distance: number): { point: Point; angle: number } {
    let remaining = Math.max(0, Math.min(distance, arrow.totalLength));
    for (let i = 0; i < arrow.segLengths.length; i++) {
      const segLen = arrow.segLengths[i];
      if (remaining <= segLen || i === arrow.segLengths.length - 1) {
        const t = segLen === 0 ? 0 : remaining / segLen;
        const a = arrow.points[i];
        const b = arrow.points[i + 1];
        return {
          point: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
          angle: Math.atan2(b.y - a.y, b.x - a.x),
        };
      }
      remaining -= segLen;
    }
    const last = arrow.points[arrow.points.length - 1];
    return { point: last, angle: 0 };
  }

  private tick = (time: number): void => {
    const dt = Math.min(time - this.lastTime, 50);
    this.lastTime = time;

    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawClouds(dt);
    this.updateAndDrawArrows(dt, time);

    this.rafId = requestAnimationFrame(this.tick);
  };

  private drawClouds(dt: number): void {
    const ctx = this.ctx;
    ctx.strokeStyle = `rgba(${CLOUD_COLOR}, 0.28)`;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    for (const cloud of this.clouds) {
      cloud.x -= cloud.speed * dt;
      if (cloud.x + cloud.width < -20) {
        cloud.x = this.width + 20;
        cloud.y = 20 + Math.random() * Math.max(1, this.height - 40);
      }

      for (let i = 0; i < cloud.lines; i++) {
        const yOff = i * 7;
        const w = cloud.width * (1 - i * 0.18);
        ctx.beginPath();
        ctx.moveTo(cloud.x, cloud.y + yOff);
        ctx.lineTo(cloud.x + w, cloud.y + yOff);
        ctx.stroke();
      }
    }
  }

  private updateAndDrawArrows(dt: number, time: number): void {
    for (const arrow of this.arrows) {
      if (arrow.state === 'drawing') {
        arrow.progress = Math.min(1, arrow.progress + arrow.speed * dt);
        if (arrow.progress >= 1) {
          arrow.state = 'holding';
          arrow.holdUntil = time + HOLD_MS;
        }
      } else if (arrow.state === 'holding') {
        if (time >= arrow.holdUntil) {
          arrow.state = 'fading';
          arrow.holdUntil = time + FADE_MS;
        }
      } else {
        const remain = arrow.holdUntil - time;
        arrow.opacity = Math.max(0, remain / FADE_MS);
      }

      this.drawArrow(arrow);
    }

    this.arrows = this.arrows.filter((a) => !(a.state === 'fading' && a.opacity <= 0));
    while (this.arrows.length < MIN_ARROWS) this.arrows.push(this.spawnArrow());
    if (this.arrows.length < MAX_ARROWS && Math.random() < 0.003) this.arrows.push(this.spawnArrow());
  }

  private drawArrow(arrow: Arrow): void {
    const ctx = this.ctx;
    const headDistance = arrow.progress * arrow.totalLength;
    const tailDistance = Math.max(0, headDistance - arrow.totalLength * TAIL_FRACTION);
    const baseOpacity = arrow.state === 'fading' ? arrow.opacity : 1;

    const steps = 18;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < steps; i++) {
      const d0 = tailDistance + ((headDistance - tailDistance) * i) / steps;
      const d1 = tailDistance + ((headDistance - tailDistance) * (i + 1)) / steps;
      const p0 = this.pointAtDistance(arrow, d0).point;
      const p1 = this.pointAtDistance(arrow, d1).point;
      const localOpacity = ((i + 1) / steps) * baseOpacity;
      ctx.strokeStyle = `rgba(${ARROW_COLOR}, ${0.55 * localOpacity})`;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }

    const { point, angle } = this.pointAtDistance(arrow, headDistance);
    const size = 17;
    ctx.fillStyle = `rgba(${ARROW_COLOR}, ${baseOpacity})`;
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size * 0.55);
    ctx.lineTo(-size * 0.6, 0);
    ctx.lineTo(-size, size * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
