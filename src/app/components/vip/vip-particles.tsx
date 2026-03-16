/**
 * VIP Gold Particle System
 * Floating golden particles that rise across the viewport.
 * Only renders when Governor VIP mode is active.
 */

import React, { useEffect, useRef, useCallback } from "react";
import { useVIP } from "./vip-context";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  hue: number; // gold range: 35-55
  life: number;
  maxLife: number;
}

export function VIPParticles() {
  const { vipActive } = useVIP();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);

  const createParticle = useCallback((width: number, height: number): Particle => {
    return {
      x: Math.random() * width,
      y: height + 10,
      size: Math.random() * 3 + 1,
      speedY: -(Math.random() * 0.8 + 0.2),
      speedX: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.6 + 0.2,
      hue: 35 + Math.random() * 20,
      life: 0,
      maxLife: 300 + Math.random() * 400,
    };
  }, []);

  useEffect(() => {
    if (!vipActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Seed initial particles
    particlesRef.current = [];
    for (let i = 0; i < 30; i++) {
      const p = createParticle(canvas.width, canvas.height);
      p.y = Math.random() * canvas.height;
      p.life = Math.random() * p.maxLife;
      particlesRef.current.push(p);
    }

    const MAX_PARTICLES = 50;

    function animate() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Spawn new particles
      if (particlesRef.current.length < MAX_PARTICLES && Math.random() < 0.1) {
        particlesRef.current.push(createParticle(canvas.width, canvas.height));
      }

      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.life++;

        const lifeRatio = p.life / p.maxLife;
        const fadeIn = Math.min(lifeRatio * 5, 1);
        const fadeOut = lifeRatio > 0.7 ? 1 - (lifeRatio - 0.7) / 0.3 : 1;
        const alpha = p.opacity * fadeIn * fadeOut;

        if (alpha <= 0 || p.life >= p.maxLife) return false;

        // Draw particle with gold glow
        ctx.save();
        ctx.globalAlpha = alpha;

        // Outer glow
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        gradient.addColorStop(0, `hsla(${p.hue}, 80%, 65%, 0.3)`);
        gradient.addColorStop(1, `hsla(${p.hue}, 80%, 65%, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = `hsla(${p.hue}, 85%, 70%, 1)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        return true;
      });

      animRef.current = requestAnimationFrame(animate);
    }

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      particlesRef.current = [];
    };
  }, [vipActive, createParticle]);

  if (!vipActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 5 }}
    />
  );
}
