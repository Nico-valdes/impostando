"use client";

import { useState, useEffect, useMemo } from "react";

const DICEBEAR_BASE = "https://api.dicebear.com/9.x/croodles/svg";

// Genera una URL de avatar de DiceBear basada en un seed
export function generateAvatarUrl(seed: string): string {
  return `${DICEBEAR_BASE}?seed=${encodeURIComponent(seed)}&size=128`;
}

// Genera seeds determinísticos para previsualización (siempre los mismos)
export function generateDeterministicSeeds(count: number = 30): string[] {
  const seeds: string[] = [];
  // Usar un seed base fijo para que siempre sean los mismos
  const baseSeed = "impostando-avatar-collection";
  for (let i = 0; i < count; i++) {
    // Generar seeds determinísticos basados en el índice
    seeds.push(`${baseSeed}-${i}`);
  }
  return seeds;
}

// Genera seeds aleatorios para previsualización (legacy, mantener por compatibilidad)
export function generateRandomSeeds(count: number = 12): string[] {
  return generateDeterministicSeeds(count);
}

export function useAvatar(playerName: string) {
  const [avatarSeed, setAvatarSeed] = useState<string>(() => {
    if (typeof window === "undefined") return playerName || "default";
    if (!playerName) return "default";
    const stored = localStorage.getItem(`avatar_seed_${playerName}`);
    return stored || playerName || "default";
  });

  // Actualizar el seed cuando cambia el nombre del jugador
  useEffect(() => {
    if (typeof window !== "undefined" && playerName) {
      const stored = localStorage.getItem(`avatar_seed_${playerName}`);
      if (stored) {
        setAvatarSeed(stored);
      }
    }
  }, [playerName]);

  const avatarUrl = useMemo(() => generateAvatarUrl(avatarSeed), [avatarSeed]);

  useEffect(() => {
    if (typeof window !== "undefined" && playerName && avatarSeed) {
      localStorage.setItem(`avatar_seed_${playerName}`, avatarSeed);
    }
  }, [avatarSeed, playerName]);

  const changeAvatar = (newSeed: string) => {
    setAvatarSeed(newSeed);
  };

  return { 
    avatar: avatarUrl, 
    avatarSeed,
    changeAvatar,
    generateAvatarUrl 
  };
}

