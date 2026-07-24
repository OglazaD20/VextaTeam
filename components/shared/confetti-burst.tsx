"use client";

import * as React from "react";

const COLORS = ["#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vr: number;
  color: string;
  size: number;
}

/** Fires a physics-based confetti burst once when `fire` becomes true. */
export function ConfettiBurst({ fire }: { fire: boolean }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (!fire) return;
    // Respects prefers-reduced-motion — a full-screen particle burst is
    // exactly the kind of motion that setting asks apps to skip.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = Array.from({ length: 140 }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 240,
      y: canvas.height * 0.25,
      vx: (Math.random() - 0.5) * 12,
      vy: Math.random() * -12 - 4,
      rotation: Math.random() * 360,
      vr: (Math.random() - 0.5) * 10,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 6 + 4,
    }));

    let frame = 0;
    let animationId: number;

    function tick() {
      frame += 1;
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      for (const p of particles) {
        p.vy += 0.35;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vr;
        ctx!.save();
        ctx!.translate(p.x, p.y);
        ctx!.rotate((p.rotation * Math.PI) / 180);
        ctx!.fillStyle = p.color;
        ctx!.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx!.restore();
      }
      if (frame < 140) {
        animationId = requestAnimationFrame(tick);
      } else {
        ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      }
    }
    tick();

    return () => cancelAnimationFrame(animationId);
  }, [fire]);

  if (!fire) return null;

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-100" aria-hidden="true" />;
}
