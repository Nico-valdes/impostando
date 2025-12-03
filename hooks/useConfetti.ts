"use client";

import { useEffect, useRef } from "react";

export function useConfetti(isImpostor: boolean, trigger: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!trigger || !containerRef.current || typeof document === "undefined") return;

    const container = containerRef.current;
    const particles: HTMLDivElement[] = [];
    const particleCount = isImpostor ? 30 : 50;

    // Crear partículas
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement("div");
      const size = Math.random() * 8 + 4;
      const colors = isImpostor
        ? ["#ef4444", "#dc2626", "#991b1b", "#000000"]
        : ["#10b981", "#059669", "#047857", "#3b82f6", "#2563eb"];

      particle.style.position = "absolute";
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      particle.style.borderRadius = isImpostor ? "50%" : Math.random() > 0.5 ? "50%" : "0%";
      particle.style.left = "50%";
      particle.style.top = "50%";
      particle.style.pointerEvents = "none";
      particle.style.zIndex = "9999";
      particle.style.opacity = "0";

      container.appendChild(particle);
      particles.push(particle);

      // Animación
      const angle = (Math.PI * 2 * i) / particleCount;
      const velocity = Math.random() * 200 + 100;
      const x = Math.cos(angle) * velocity;
      const y = Math.sin(angle) * velocity;

      particle.animate(
        [
          {
            opacity: 0,
            transform: "translate(0, 0) rotate(0deg) scale(1)",
          },
          {
            opacity: 1,
            offset: 0.1,
          },
          {
            opacity: 1,
            transform: `translate(${x}px, ${y}px) rotate(${360 * (Math.random() > 0.5 ? 1 : -1)}deg) scale(0)`,
          },
        ],
        {
          duration: 2000,
          easing: "cubic-bezier(0.5, 0, 0.5, 1)",
        }
      ).onfinish = () => {
        particle.remove();
      };
    }

    return () => {
      particles.forEach((p) => {
        if (p.parentNode) p.remove();
      });
    };
  }, [isImpostor, trigger]);

  return containerRef;
}

