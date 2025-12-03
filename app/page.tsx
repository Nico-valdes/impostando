"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlayerSetupModal } from "../components/PlayerSetupModal";

function generateRoomCode() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 5).toUpperCase();
  }
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 5; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export default function HomePage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [impostors, setImpostors] = useState(1);
  const [popularTeams, setPopularTeams] = useState(true);
  const [famousPlayers, setFamousPlayers] = useState(true);
  const [customCardInput, setCustomCardInput] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [pendingJoinCode, setPendingJoinCode] = useState("");

  const customCards = useMemo(
    () => customCardInput.split("\n").map((l) => l.trim()).filter(Boolean),
    [customCardInput],
  );

  const handleCreateRoom = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = playerName.trim() || "Host";
    const code = generateRoomCode();
    const params = new URLSearchParams({
      name: trimmedName,
      host: "1",
      sport: "all",
      maxPlayers: String(maxPlayers),
      impostors: String(impostors),
      popularTeams: popularTeams ? "1" : "0",
      famousPlayers: famousPlayers ? "1" : "0",
    });
    if (customCards.length > 0) {
      params.set("customCards", encodeURIComponent(JSON.stringify(customCards)));
    }
    router.push(`/room/${code}?${params.toString()}`);
  };

  const handleJoinRoom = (e: FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code || code.length !== 5) return;
    setPendingJoinCode(code);
    setShowJoinModal(true);
  };

  const handleJoinWithSetup = (name: string, avatarSeed: string) => {
    const params = new URLSearchParams({
      name: name.slice(0, 24),
      host: "0",
      avatarSeed: avatarSeed,
    });
    router.push(`/room/${pendingJoinCode}?${params.toString()}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="grid w-full max-w-6xl grid-cols-1 gap-8 lg:grid-cols-[1fr_400px]"
      >
        
        {/* Hero Section */}
        <div className="flex flex-col justify-center space-y-6 lg:space-y-8 lg:pr-12 text-center lg:text-left">
          <div className="space-y-2">
            <motion.span 
              className="text-xs font-medium tracking-[0.2em] text-neutral-500 uppercase"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              Role Strategy Game
            </motion.span>
            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-light tracking-tight text-white">
              Impos<span className="font-bold">tando</span>
            </h1>
            <p className="mx-auto lg:mx-0 max-w-md text-base sm:text-lg text-neutral-400 leading-relaxed">
              Un juego de deducción social con temática deportiva. Ya tenés un código? Elegí tu avatar y unite a la partida.
            </p>
          </div>

          <div className="hidden lg:grid grid-cols-2 gap-4 text-sm text-neutral-500">
            <div className="glass-panel p-4 flex flex-col gap-2">
              <span className="text-white font-medium">Crear</span>
              <p>Configurá tu sala, elegí el deporte y desafiá a tus amigos.</p>
            </div>
            <div className="glass-panel p-4 flex flex-col gap-2">
              <span className="text-white font-medium">Unirse</span>
              <p>Ya tenés un código? Ingresá y demostrá tus conocimientos.</p>
            </div>
          </div>
        </div>

        {/* Interactive Section */}
        <div className="flex flex-col gap-6">
          
          {/* Create Room */}
          <div className="glass-panel p-6 sm:p-8 space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700 ease-out" />
            
            <div className="relative z-10 space-y-6">
              <h2 className="text-xl font-medium tracking-wide">Nueva Partida</h2>
              
              <form onSubmit={handleCreateRoom} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs text-neutral-500 uppercase tracking-wider">Tu Alias</label>
                  <input
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={24}
                    className="w-full py-3 text-lg bg-transparent border-b border-neutral-800 focus:border-white transition-colors"
                    placeholder="Ej. Maverick"
                  />
                </div>

                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center justify-between w-full p-3 text-xs text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
                  >
                    <span>CONFIGURACIÓN AVANZADA</span>
                    <span>{showAdvanced ? "−" : "+"}</span>
                  </button>

                  <AnimatePresence>
                    {showAdvanced && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-6 pt-2"
                      >
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="block text-[10px] text-neutral-500 mb-2">MAX JUGADORES</label>
                            <input
                              type="number"
                              min={3}
                              max={20}
                              value={maxPlayers}
                              onChange={(e) => setMaxPlayers(Math.min(20, Math.max(3, Number(e.target.value) || 3)))}
                              className="w-full py-2 text-base bg-transparent border-b border-neutral-800 text-center"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-neutral-500 mb-2">IMPOSTORES</label>
                            <input
                              type="number"
                              min={1}
                              max={5}
                              value={impostors}
                              onChange={(e) => setImpostors(Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
                              className="w-full py-2 text-base bg-transparent border-b border-neutral-800 text-center"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-3 pt-2">
                          <label className="flex items-center gap-4 cursor-pointer group/check p-2 -mx-2 hover:bg-white/5 transition-colors">
                            <div className={`w-5 h-5 border transition-colors flex items-center justify-center ${popularTeams ? "bg-white border-white" : "border-neutral-700 group-hover/check:border-neutral-500"}`}>
                              {popularTeams && <span className="text-black text-xs font-bold">✓</span>}
                            </div>
                            <input type="checkbox" className="hidden" checked={popularTeams} onChange={(e) => setPopularTeams(e.target.checked)} />
                            <span className="text-xs text-neutral-400 group-hover/check:text-white transition-colors">Equipos Populares</span>
                          </label>
                          
                          <label className="flex items-center gap-4 cursor-pointer group/check p-2 -mx-2 hover:bg-white/5 transition-colors">
                            <div className={`w-5 h-5 border transition-colors flex items-center justify-center ${famousPlayers ? "bg-white border-white" : "border-neutral-700 group-hover/check:border-neutral-500"}`}>
                              {famousPlayers && <span className="text-black text-xs font-bold">✓</span>}
                            </div>
                            <input type="checkbox" className="hidden" checked={famousPlayers} onChange={(e) => setFamousPlayers(e.target.checked)} />
                            <span className="text-xs text-neutral-400 group-hover/check:text-white transition-colors">Jugadores Famosos</span>
                          </label>
                        </div>

                        <div className="pt-2">
                          <label className="block text-[10px] text-neutral-500 mb-2">CARTAS PERSONALIZADAS</label>
                          <textarea
                            value={customCardInput}
                            onChange={(e) => setCustomCardInput(e.target.value)}
                            rows={3}
                            className="w-full p-3 text-xs bg-white/5 border border-neutral-800 focus:border-neutral-600 transition-colors resize-none leading-relaxed"
                            placeholder="Una por línea..."
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full py-4 mt-4 text-sm tracking-widest uppercase active:scale-[0.98] transition-transform"
                >
                  Empezar Partida
                </button>
              </form>
            </div>
          </div>

          {/* Join Room */}
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">¿Ya tenés código?</span>
            </div>
            <form onSubmit={handleJoinRoom} className="flex flex-col sm:flex-row gap-3 sm:gap-0">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={5}
                className="w-full sm:flex-1 py-3 text-center text-xl tracking-[0.5em] font-mono bg-white/5 border-b sm:border-b-0 focus:bg-white/10 transition-colors"
                placeholder="XXXXX"
              />
              <button
                type="submit"
                className="btn-secondary w-full sm:w-auto px-8 py-3 text-sm tracking-widest uppercase hover:bg-white hover:text-black active:scale-[0.98] transition-transform"
              >
                Entrar
              </button>
            </form>
          </div>

        </div>
      </motion.div>

      {/* Modal para configurar perfil al unirse */}
      <PlayerSetupModal
        isOpen={showJoinModal}
        onComplete={handleJoinWithSetup}
        defaultName={playerName}
        title="Unirse a la Partida"
      />
    </div>
  );
}
