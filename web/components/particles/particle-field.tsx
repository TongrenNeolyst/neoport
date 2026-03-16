"use client";

import * as React from "react";
import { useTheme } from "next-themes";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: number;
  baseAlpha: number;
  phase: number;
};

export type ParticleFieldProps = {
  particleCount?: number;
};

export function ParticleField({
  particleCount = 120,
}: ParticleFieldProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const { theme } = useTheme();

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasEl: HTMLCanvasElement = canvas;

    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;
    const ctx2: CanvasRenderingContext2D = ctx;

    let raf = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const linkDistance = 140;
    const speedFactor = 2;
    const pulseSpeed = 0.15;

    const particles: Particle[] = [];

    function rand(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    function resize() {
      dpr = Math.max(1, window.devicePixelRatio || 1);
      width = window.innerWidth;
      height = window.innerHeight;
      canvasEl.width = Math.floor(width * dpr);
      canvasEl.height = Math.floor(height * dpr);
      canvasEl.style.width = `${width}px`;
      canvasEl.style.height = `${height}px`;
      ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function initParticles() {
      particles.length = 0;
      for (let i = 0; i < particleCount; i += 1) {
        particles.push({
          x: rand(0, width),
          y: rand(0, height),
          vx: rand(-0.3, 0.3) * speedFactor,
          vy: rand(-0.3, 0.3) * speedFactor,
          r: rand(1, 3),
          hue: rand(200, 260),
          baseAlpha: rand(0.3, 0.7),
          phase: rand(0, Math.PI * 2),
        });
      }
    }

    function tick(tMs: number) {
      const t = tMs * 0.001;

      ctx2.clearRect(0, 0, width, height);

      // Adjust colors based on theme
      const isDark = theme === "dark";
      const particleHue = isDark ? 210 : 200;
      const particleLightness = isDark ? 70 : 50;

      // Move
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) {
          p.x = 0;
          p.vx *= -1;
        } else if (p.x > width) {
          p.x = width;
          p.vx *= -1;
        }

        if (p.y < 0) {
          p.y = 0;
          p.vy *= -1;
        } else if (p.y > height) {
          p.y = height;
          p.vy *= -1;
        }
      }

      // Links
      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist >= linkDistance) continue;

          const alpha = (1 - dist / linkDistance) * 0.35;
          const hue = (a.hue + b.hue) / 2;
          ctx2.strokeStyle = `hsla(${hue}, 100%, ${particleLightness}%, ${alpha})`;
          ctx2.lineWidth = 1.2;
          ctx2.beginPath();
          ctx2.moveTo(a.x, a.y);
          ctx2.lineTo(b.x, b.y);
          ctx2.stroke();
        }
      }

      // Particles
      for (const p of particles) {
        const pulse = (Math.sin(t * (Math.PI * 2) * pulseSpeed + p.phase) + 1) / 2;
        const alpha = p.baseAlpha * (0.6 + pulse * 0.4);
        ctx2.fillStyle = `hsla(${particleHue}, 100%, ${particleLightness}%, ${alpha})`;
        ctx2.beginPath();
        ctx2.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx2.fill();
      }

      raf = window.requestAnimationFrame(tick);
    }

    resize();
    initParticles();
    raf = window.requestAnimationFrame(tick);

    const onResize = () => {
      resize();
      initParticles();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      window.cancelAnimationFrame(raf);
    };
  }, [particleCount, theme]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}
