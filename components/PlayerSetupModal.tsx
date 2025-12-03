"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generateAvatarUrl, generateDeterministicSeeds } from "../hooks/useAvatar";

type PlayerSetupModalProps = {
  isOpen: boolean;
  onComplete: (name: string, avatarSeed: string) => void;
  defaultName?: string;
  title?: string;
};

const AVATARS_PER_PAGE = 12;
const TOTAL_AVATARS = 30;

export function PlayerSetupModal({
  isOpen,
  onComplete,
  defaultName = "",
  title = "Configura tu perfil",
}: PlayerSetupModalProps) {
  const [playerName, setPlayerName] = useState(defaultName);
  const [selectedSeed, setSelectedSeed] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Generar todos los avatares de forma determinística (siempre los mismos)
  const allAvatarSeeds = useMemo(() => generateDeterministicSeeds(TOTAL_AVATARS), []);
  const totalPages = Math.ceil(TOTAL_AVATARS / AVATARS_PER_PAGE);

  // Avatares de la página actual
  const currentPageSeeds = useMemo(() => {
    const start = currentPage * AVATARS_PER_PAGE;
    const end = start + AVATARS_PER_PAGE;
    return allAvatarSeeds.slice(start, end);
  }, [currentPage, allAvatarSeeds]);

  // Generar avatares solo en el cliente para evitar errores de hidratación
  useEffect(() => {
    if (typeof window !== "undefined" && isOpen && !mounted) {
      setSelectedSeed(allAvatarSeeds[0] || "");
      setMounted(true);
    }
  }, [isOpen, mounted, allAvatarSeeds]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = playerName.trim() || "Jugador";
    if (trimmedName && selectedSeed) {
      onComplete(trimmedName, selectedSeed);
    }
  };

  if (!isOpen) return null;

  // No renderizar hasta que esté montado (solo en cliente)
  if (!mounted) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="glass-panel p-8 w-full max-w-md">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-white/10 rounded w-3/4"></div>
            <div className="h-4 bg-white/5 rounded w-full"></div>
            <div className="h-12 bg-white/5 rounded"></div>
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square bg-white/5 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="glass-panel p-8 w-full max-w-md space-y-6"
        >
          <div className="space-y-2">
            <h2 className="text-2xl font-medium tracking-wide">{title}</h2>
            <p className="text-sm text-neutral-400">
              Elegí tu nombre y avatar para unirte a la partida
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nombre */}
            <div className="space-y-2">
              <label className="text-xs text-neutral-500 uppercase tracking-wider">
                Tu Nombre
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={24}
                className="w-full py-3 px-4 text-lg bg-white/5 border border-white/10 focus:border-white focus:bg-white/10 transition-colors"
                placeholder="Ej. Maverick"
                autoFocus
                required
              />
            </div>

            {/* Selección de Avatar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-neutral-500 uppercase tracking-wider">
                  Elige tu Avatar
                </label>
                <span className="text-xs text-neutral-500">
                  {currentPage + 1} / {totalPages}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {currentPageSeeds.map((seed) => {
                  const avatarUrl = generateAvatarUrl(seed);
                  const isSelected = selectedSeed === seed;
                  return (
                    <button
                      key={seed}
                      type="button"
                      onClick={() => setSelectedSeed(seed)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        isSelected
                          ? "border-white scale-105"
                          : "border-white/20 hover:border-white/40 active:scale-95"
                      }`}
                    >
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-white/10 flex items-center justify-center">
                          <span className="text-white text-xl">✓</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              
              {/* Navegación de páginas */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                    disabled={currentPage === 0}
                    className="px-3 py-1.5 text-xs border border-white/20 hover:border-white/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Anterior
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCurrentPage(i)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          currentPage === i
                            ? "bg-white"
                            : "bg-white/20 hover:bg-white/40"
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
                    disabled={currentPage === totalPages - 1}
                    className="px-3 py-1.5 text-xs border border-white/20 hover:border-white/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </div>

            {/* Preview del avatar seleccionado */}
            {selectedSeed && (
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
                <img
                  src={generateAvatarUrl(selectedSeed)}
                  alt="Avatar preview"
                  className="w-16 h-16 rounded-full border-2 border-white/20"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{playerName || "Jugador"}</p>
                  <p className="text-xs text-neutral-400">Listo para unirse</p>
                </div>
              </div>
            )}

            {/* Botón de confirmación */}
            <button
              type="submit"
              className="btn-primary w-full py-4 text-sm tracking-widest uppercase"
              disabled={!playerName.trim() || !selectedSeed}
            >
              Continuar
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

