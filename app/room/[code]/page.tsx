"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState, useRef, useImperativeHandle, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRoomSocket, type RoomState, type GameCard } from "../../../hooks/useRoomSocket";
import { usePlayerStats } from "../../../hooks/usePlayerStats";
import { useConfetti } from "../../../hooks/useConfetti";
import { useNotifications } from "../../../hooks/useNotifications";
import { useAvatar, generateAvatarUrl, generateDeterministicSeeds } from "../../../hooks/useAvatar";
import { useShare } from "../../../hooks/useShare";
import { PlayerSetupModal } from "../../../components/PlayerSetupModal";

export default function RoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ code: string }>();
  const roomCode = (params.code ?? "").toUpperCase();
  const initialName = searchParams.get("name");
  const initialAvatarSeed = searchParams.get("avatarSeed");
  const [playerName, setPlayerName] = useState(initialName || "");
  const [avatarSeed, setAvatarSeed] = useState(initialAvatarSeed || "");
  const [showSetupModal, setShowSetupModal] = useState(!initialName || !initialAvatarSeed);
  const isHost = searchParams.get("host") === "1" || searchParams.get("host") === "true";

  const initialSettings = useMemo(
    () => ({
      sport: (searchParams.get("sport") as RoomState["settings"]["sport"]) || "all",
      maxPlayers: Number(searchParams.get("maxPlayers")) || 10,
      impostors: Number(searchParams.get("impostors")) || 1,
      filters: {
        popularTeams: searchParams.get("popularTeams") !== "0",
        famousPlayers: searchParams.get("famousPlayers") !== "0",
      },
      customCards: (() => {
        const raw = searchParams.get("customCards");
        if (!raw) return [];
        try {
          return Array.isArray(JSON.parse(decodeURIComponent(raw))) ? JSON.parse(decodeURIComponent(raw)) : [];
        } catch {
          return [];
        }
      })(),
    }),
    [searchParams],
  );

  const { stats, registerGameStart, registerGameEnd } = usePlayerStats(playerName);
  const { notify } = useNotifications();
  // Usar el nombre efectivo (del estado o inicial) para el hook de avatar
  const effectivePlayerName = playerName || initialName || "Jugador";
  const { avatar, avatarSeed: currentAvatarSeed, changeAvatar } = useAvatar(effectivePlayerName);
  const { share, copied } = useShare();
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [previousPhase, setPreviousPhase] = useState<RoomState["phase"] | null>(null);
  
  // Seeds determinísticos (siempre los mismos 30 avatares)
  const allAvatarSeeds = useMemo(() => generateDeterministicSeeds(30), []);
  const AVATARS_PER_PAGE = 12;
  const totalAvatarPages = Math.ceil(allAvatarSeeds.length / AVATARS_PER_PAGE);
  
  // Calcular la página inicial basada en el avatar actual
  const getInitialPage = useMemo(() => {
    if (!currentAvatarSeed) return 0;
    const index = allAvatarSeeds.indexOf(currentAvatarSeed);
    return index >= 0 ? Math.floor(index / AVATARS_PER_PAGE) : 0;
  }, [currentAvatarSeed, allAvatarSeeds]);
  
  const [avatarPickerPage, setAvatarPickerPage] = useState(getInitialPage);
  
  // Avatares de la página actual del selector
  const currentAvatarPageSeeds = useMemo(() => {
    const start = avatarPickerPage * AVATARS_PER_PAGE;
    const end = start + AVATARS_PER_PAGE;
    return allAvatarSeeds.slice(start, end);
  }, [avatarPickerPage, allAvatarSeeds]);
  
  // Cuando se abre el selector, ir a la página del avatar actual
  useEffect(() => {
    if (showAvatarPicker && currentAvatarSeed) {
      const index = allAvatarSeeds.indexOf(currentAvatarSeed);
      if (index >= 0) {
        setAvatarPickerPage(Math.floor(index / AVATARS_PER_PAGE));
      }
    }
  }, [showAvatarPicker, currentAvatarSeed, allAvatarSeeds]);

  // Usar el avatarSeed de la URL o del estado local, o el actual del hook
  const effectiveAvatarSeed = avatarSeed || initialAvatarSeed || currentAvatarSeed || playerName || "default";

  const {
    connected,
    roomState,
    myCard,
    updateSettings,
    updateAvatar,
    startGame,
    reshuffle,
    endGame,
    lockRoom,
    kickPlayer,
    transferHost,
  } = useRoomSocket({
    roomCode,
    playerName: playerName || initialName || "Jugador",
    isHost,
    initialSettings,
    avatarSeed: effectiveAvatarSeed,
    onCardReceived: (card) => {
      registerGameStart(card);
      notify(card.isImpostor ? "🎭 Eres el impostor" : "✅ Eres tripulación");
    },
    onGameEnded: (summary) => {
      registerGameEnd(summary);
      notify(summary.winner === "crew" ? "✅ Ganó la tripulación" : "🎭 Ganaron los impostores");
    },
  });

  // Si hay avatarSeed en URL, actualizarlo
  useEffect(() => {
    if (initialAvatarSeed && initialAvatarSeed !== currentAvatarSeed) {
      changeAvatar(initialAvatarSeed);
    }
  }, [initialAvatarSeed, currentAvatarSeed, changeAvatar]);

  // Actualizar avatar en el servidor cuando cambia el seed
  useEffect(() => {
    if (connected && updateAvatar && avatarSeed && avatarSeed !== currentAvatarSeed) {
      // Pequeño delay para asegurar que el socket esté listo
      const timer = setTimeout(() => {
        console.log("Actualizando avatar en servidor:", avatarSeed);
        updateAvatar(avatarSeed);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [connected, avatarSeed, updateAvatar, currentAvatarSeed]);

  useEffect(() => {
    if (roomState && roomState.phase !== previousPhase) {
      if (previousPhase === "lobby" && roomState.phase === "in-game") {
        notify("¡La partida ha comenzado!");
      } else if (previousPhase === "in-game" && roomState.phase === "ended") {
        notify("Partida finalizada");
      }
      setPreviousPhase(roomState.phase);
    }
  }, [roomState?.phase, previousPhase, notify]);

  const handleSetupComplete = (name: string, seed: string) => {
    console.log("Setup completo:", { name, seed });
    setPlayerName(name);
    setAvatarSeed(seed);
    changeAvatar(seed);
    setShowSetupModal(false);
    // Actualizar URL sin recargar
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("name", name);
    newParams.set("avatarSeed", seed);
    window.history.replaceState({}, "", `${window.location.pathname}?${newParams.toString()}`);
    // Actualizar en el servidor cuando esté conectado
    // Usar un delay más largo para asegurar que el socket esté listo
    if (connected && updateAvatar) {
      console.log("Enviando avatar al servidor:", seed);
      setTimeout(() => {
        updateAvatar(seed);
      }, 500);
    } else {
      console.log("Esperando conexión para enviar avatar...");
      // Si no está conectado, esperar a que se conecte
      const checkConnection = setInterval(() => {
        if (connected && updateAvatar) {
          console.log("Conexión establecida, enviando avatar:", seed);
          updateAvatar(seed);
          clearInterval(checkConnection);
        }
      }, 100);
      // Limpiar después de 5 segundos
      setTimeout(() => clearInterval(checkConnection), 5000);
    }
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const success = await share(url, "Únete a mi partida de Impostando");
    if (success && !copied) {
      notify("Link compartido");
    } else if (success && copied) {
      notify("Link copiado");
    }
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!roomState && connected) return;
  }, [roomState, connected]);

  const iAmHost = roomState?.hostId && roomState.hostId === roomState.players.find((p) => p.name === playerName)?.id;

  return (
    <div className="flex min-h-screen flex-col bg-[#050505] text-[#ededed]">
      {/* Architectural Header - Optimized for Mobile */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#050505]/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white text-black flex items-center justify-center font-bold text-xs rounded-sm">IM</div>
                          <div className="flex flex-col">
                            <span className="hidden sm:block text-[10px] tracking-widest text-neutral-500 uppercase">Sala</span>
                            <span className="font-mono text-sm tracking-wider">{roomCode}</span>
                          </div>
            </div>
            
            <div className="h-6 w-px bg-white/10 hidden sm:block" />
            
            <div className="relative">
              {!showSetupModal && (
                <button 
                  onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                  className="group flex items-center gap-2 hover:bg-white/5 px-2 sm:px-3 py-1.5 transition-colors rounded-sm"
                >
                  <img 
                    src={avatarSeed ? generateAvatarUrl(avatarSeed) : avatar} 
                    alt="Avatar" 
                    className="w-8 h-8 rounded-full border border-white/20"
                    key={avatarSeed || currentAvatarSeed}
                  />
                  <span className="text-xs text-neutral-400 group-hover:text-white transition-colors max-w-[80px] truncate hidden sm:block">{playerName}</span>
                </button>
              )}
              {showSetupModal && (
                <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5">
                  <div className="w-8 h-8 rounded-full border border-white/20 bg-white/5 flex items-center justify-center">
                    <span className="text-xs text-neutral-500">?</span>
                  </div>
                  <span className="text-xs text-neutral-500 hidden sm:block">Configurando...</span>
                </div>
              )}
              
              {!showSetupModal && showAvatarPicker && (
                <>
                  {/* Overlay para cerrar en móvil - solo para detectar clicks fuera */}
                  <div 
                    className="fixed inset-0 z-[100] lg:hidden"
                    onClick={() => setShowAvatarPicker(false)}
                  />
                  {/* Selector de avatar */}
                  <div className="fixed left-4 right-4 top-20 sm:top-24 lg:absolute lg:left-auto lg:right-0 lg:top-full lg:translate-x-0 lg:translate-y-0 lg:mt-2 p-4 sm:p-5 bg-[rgba(10,10,10,0.95)] backdrop-blur-xl border border-white/10 rounded-sm shadow-2xl w-auto lg:w-96 max-w-sm z-[110] lg:z-50 max-h-[calc(100vh-6rem)] overflow-y-auto lg:glass-panel">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium">Cambiar Avatar</p>
                      <button
                        onClick={() => setShowAvatarPicker(false)}
                        className="lg:hidden text-neutral-400 hover:text-white text-xl leading-none w-6 h-6 flex items-center justify-center"
                        aria-label="Cerrar"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-400">{avatarPickerPage + 1} / {totalAvatarPages}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
                        {currentAvatarPageSeeds.map(seed => {
                          const avatarUrl = generateAvatarUrl(seed);
                          const isSelected = currentAvatarSeed === seed;
                          return (
                            <button
                              key={seed}
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                // Actualizar el avatar localmente
                                changeAvatar(seed);
                                // Actualizar el estado del avatarSeed
                                setAvatarSeed(seed);
                                // Actualizar en el servidor
                                if (updateAvatar && connected) {
                                  updateAvatar(seed);
                                } else {
                                  // Si no está conectado, intentar después de un delay
                                  setTimeout(() => {
                                    if (updateAvatar && connected) {
                                      updateAvatar(seed);
                                    }
                                  }, 500);
                                }
                                // Actualizar URL
                                const newParams = new URLSearchParams(searchParams.toString());
                                newParams.set("avatarSeed", seed);
                                window.history.replaceState({}, "", `${window.location.pathname}?${newParams.toString()}`);
                                setShowAvatarPicker(false); 
                              }}
                              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                isSelected
                                  ? "border-white scale-105 shadow-lg shadow-white/20"
                                  : "border-white/20 hover:border-white/40 active:scale-95"
                              }`}
                            >
                              <img
                                src={avatarUrl}
                                alt="Avatar option"
                                className="w-full h-full object-cover"
                              />
                              {isSelected && (
                                <div className="absolute inset-0 bg-white/20 flex items-center justify-center">
                                  <span className="text-white text-base font-bold">✓</span>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      
                      {/* Navegación de páginas */}
                      {totalAvatarPages > 1 && (
                        <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-white/10">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAvatarPickerPage((prev) => Math.max(0, prev - 1));
                            }}
                            disabled={avatarPickerPage === 0}
                            className="px-2 py-1.5 sm:px-3 text-[10px] sm:text-xs border border-white/20 hover:border-white/40 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all rounded active:scale-95"
                            aria-label="Página anterior"
                          >
                            <span className="hidden sm:inline">← Anterior</span>
                            <span className="sm:hidden">←</span>
                          </button>
                          <div className="flex gap-1 sm:gap-1.5">
                            {Array.from({ length: totalAvatarPages }).map((_, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAvatarPickerPage(i);
                                }}
                                className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all ${
                                  avatarPickerPage === i
                                    ? "bg-white scale-125"
                                    : "bg-white/20 hover:bg-white/40 active:scale-110"
                                }`}
                                aria-label={`Ir a página ${i + 1}`}
                              />
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAvatarPickerPage((prev) => Math.min(totalAvatarPages - 1, prev + 1));
                            }}
                            disabled={avatarPickerPage === totalAvatarPages - 1}
                            className="px-2 py-1.5 sm:px-3 text-[10px] sm:text-xs border border-white/20 hover:border-white/40 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all rounded active:scale-95"
                            aria-label="Página siguiente"
                          >
                            <span className="hidden sm:inline">Siguiente →</span>
                            <span className="sm:hidden">→</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
                        <div className="hidden md:flex items-center gap-4 text-xs font-mono text-neutral-500">
                          <span className={`flex items-center gap-2 ${connected ? "text-emerald-500" : "text-red-500"}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {connected ? "ONLINE" : "OFFLINE"}
                          </span>
                          <span>{roomState?.players.length ?? 0} JUGADORES</span>
                        </div>
            
                        <button 
                          onClick={handleShare}
                          className="btn-secondary px-3 py-1.5 sm:px-4 sm:py-1.5 text-[10px] uppercase tracking-widest flex items-center gap-2"
                        >
                          <span className="sm:inline hidden">{copied ? "Copiado" : "Invitar"}</span>
                          <span className="sm:hidden text-base">🔗</span>
                        </button>

                        <button 
                          onClick={() => {
                            if (confirm("¿Salir de la sala?")) {
                              router.push("/");
                            }
                          }}
                          className="px-3 py-1.5 sm:px-4 sm:py-1.5 text-[10px] uppercase tracking-widest border border-white/20 hover:border-white/40 hover:bg-white/5 transition-all flex items-center gap-2"
                        >
                          <span className="sm:inline hidden">Salir</span>
                          <span className="sm:hidden text-base">✕</span>
                        </button>

            <button 
              className="lg:hidden p-2 -mr-2"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <span className="text-xl">☰</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-8 h-full">
          
          <section className="flex flex-col min-h-[calc(100vh-140px)] sm:min-h-[600px]">
            <LobbyOrGameView
              roomState={roomState}
              myCard={myCard}
              isHost={!!iAmHost}
              connected={connected}
              onUpdateSettings={updateSettings}
              onStartGame={startGame}
              onReshuffle={reshuffle}
              onEndGame={endGame}
              onLockRoom={lockRoom}
              playersPanel={
                <PlayersPanel
                  roomState={roomState}
                  me={playerName}
                  isHost={!!iAmHost}
                  onKick={kickPlayer}
                  onTransferHost={transferHost}
                  getAvatar={(name) => {
                    if (name === playerName) {
                      // Para mi propio avatar, solo mostrar si el setup está completo
                      if (showSetupModal) {
                        return generateAvatarUrl("placeholder");
                      }
                      return avatar;
                    }
                    // Buscar el avatarSeed del jugador en el estado de la sala
                    const player = roomState?.players.find((p) => p.name === name);
                    if (player?.avatarSeed) {
                      return generateAvatarUrl(player.avatarSeed);
                    }
                    // Fallback: usar el nombre como seed (generará un avatar consistente)
                    return generateAvatarUrl(name || "default");
                  }}
                />
              }
            />
          </section>

          <aside className={`
            fixed inset-y-0 right-0 z-40 w-80 bg-[#050505] border-l border-white/10 p-6 transform transition-transform duration-300 lg:relative lg:transform-none lg:w-auto lg:border-none lg:bg-transparent lg:p-0
            ${sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
          `}>
            <div className="flex justify-between items-center lg:hidden mb-8">
              <span className="text-xs uppercase tracking-widest text-neutral-500">Personal</span>
              <button onClick={() => setSidebarOpen(false)}>✕</button>
            </div>

            <PlayersPanel
              roomState={roomState}
              me={playerName}
              isHost={!!iAmHost}
              onKick={kickPlayer}
              onTransferHost={transferHost}
              getAvatar={(name) => {
                if (name === playerName) {
                  // Para mi propio avatar, solo mostrar si el setup está completo
                  if (showSetupModal) {
                    return generateAvatarUrl("placeholder");
                  }
                  return avatar;
                }
                // Buscar el avatarSeed del jugador en el estado de la sala
                const player = roomState?.players.find((p) => p.name === name);
                if (player?.avatarSeed) {
                  return generateAvatarUrl(player.avatarSeed);
                }
                // Fallback: usar el nombre como seed
                return generateAvatarUrl(name || "default");
              }}
            />
          </aside>

        </div>
      </main>
      
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Modal para configurar perfil si no está configurado */}
      <PlayerSetupModal
        isOpen={showSetupModal}
        onComplete={handleSetupComplete}
        defaultName={playerName}
        title="Configura tu Perfil"
      />
    </div>
  );
}

type LobbyProps = {
  roomState: RoomState | null;
  myCard: GameCard | null;
  isHost: boolean;
  connected: boolean;
  onUpdateSettings: (partial: Partial<RoomState["settings"]>) => void;
  onStartGame: () => void;
  onReshuffle: () => void;
  onEndGame: (winner: "crew" | "impostors") => void;
  onLockRoom: (locked: boolean) => void;
  playersPanel: ReactNode;
};

function LobbyOrGameView({
  roomState,
  myCard,
  isHost,
  connected,
  onUpdateSettings,
  onStartGame,
  onReshuffle,
  onEndGame,
  onLockRoom,
  playersPanel,
}: LobbyProps) {
  const [showSettings, setShowSettings] = useState(false);
  const cardRevealRef = useRef<{ closeCard: () => Promise<void> } | null>(null);

  if (!roomState) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="h-full flex flex-col items-center justify-center space-y-4 text-neutral-500"
      >
        <div className="w-12 h-12 border-t-2 border-l-2 border-white animate-spin" />
        <span className="text-xs uppercase tracking-widest">Conectando a la sala...</span>
        {!connected && <span className="text-[10px] text-red-500">Servidor no responde</span>}
      </motion.div>
    );
  }

  const canStart = roomState.players.length >= 3;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={roomState.phase}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="h-full flex flex-col gap-6"
      >
        {/* Status Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-neutral-500">Estado del juego</span>
            <span className="text-xl font-light text-white">
              {roomState.phase === "lobby" ? "ESPERANDO" : roomState.phase === "in-game" ? "JUGANDO" : "TERMINADO"}
            </span>
          </div>
          
          {isHost && (
            <button
              onClick={() => onLockRoom(!roomState.locked)}
              className={`text-[10px] uppercase tracking-widest px-3 py-1 border transition-colors ${
                roomState.locked ? "border-red-500 text-red-500" : "border-neutral-700 text-neutral-500 hover:text-white"
              }`}
            >
              {roomState.locked ? "BLOQUEADO" : "DESBLOQUEADO"}
            </button>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-[350px] sm:min-h-[400px] relative py-4">
          {roomState.phase === "in-game" && myCard ? (
            <CardReveal 
              card={myCard} 
              ref={cardRevealRef}
            />
          ) : roomState.phase === "lobby" ? (
            <div className="text-center space-y-4 opacity-50">
              <div className="text-4xl sm:text-6xl font-thin">ESPERANDO</div>
              <p className="text-xs sm:text-sm font-mono tracking-widest">ESPERANDO QUE EMPIECE LA PARTIDA</p>
            </div>
          ) : (
            <div className="glass-panel p-6 sm:p-8 w-full max-w-md mx-auto text-center space-y-6">
              <h3 className="text-xs sm:text-sm uppercase tracking-widest text-neutral-400">Resultado de la Partida</h3>
              {isHost && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button onClick={() => onEndGame("crew")} className="btn-primary py-3 sm:py-4 bg-emerald-500/90 border-emerald-500 text-black font-bold text-sm uppercase tracking-wider hover:bg-emerald-400 transition-colors">
                    Tripulación
                  </button>
                  <button onClick={() => onEndGame("impostors")} className="btn-primary py-3 sm:py-4 bg-red-500/90 border-red-500 text-white font-bold text-sm uppercase tracking-wider hover:bg-red-400 transition-colors">
                    Impostores
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Host Controls - Bottom Fixed or Sticky on Mobile could be better, but inline works if spacing is right */}
        {isHost && (
          <div className="glass-panel p-4 sm:p-6 space-y-6 mt-auto">
            <div className="flex items-center justify-start">
              <button 
                onClick={() => setShowSettings(!showSettings)} 
                className="text-[10px] sm:text-xs hover:text-white transition-colors border-b border-transparent hover:border-white pb-0.5"
              >
                {showSettings ? "CERRAR" : "OPCIONES"}
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  disabled={roomState.phase === "lobby" && !canStart}
                  onClick={async () => {
                    // Si hay una carta y está abierta, cerrarla primero
                    if (roomState.phase === "in-game" && myCard && cardRevealRef.current) {
                      await cardRevealRef.current.closeCard();
                    }
                    // Luego ejecutar la acción
                    onStartGame();
                  }}
                  className={`flex-1 py-3 sm:py-4 text-xs sm:text-sm uppercase tracking-widest font-bold transition-all ${
                    (roomState.phase !== "lobby" || canStart) ? "btn-primary" : "opacity-50 cursor-not-allowed border border-white/10 bg-white/5 text-neutral-500"
                  }`}
                >
                  {roomState.phase === "lobby" ? "EMPEZAR PARTIDA" : "REINICIAR PARTIDA"}
                </button>
                
                {roomState.phase === "in-game" && (
                  <button 
                    onClick={async () => {
                      // Si hay una carta y está abierta, cerrarla primero
                      if (myCard && cardRevealRef.current) {
                        await cardRevealRef.current.closeCard();
                      }
                      // Luego ejecutar la acción
                      onReshuffle();
                    }}
                    className="btn-secondary px-6 py-3 sm:py-4 text-xs sm:text-sm uppercase tracking-widest"
                  >
                    BARAJAR CARTAS
                  </button>
                )}
              </div>
              
              {/* Explicación de las funciones */}
              <div className="text-[10px] text-neutral-500 space-y-1 pt-2 border-t border-white/5">
                {roomState.phase === "lobby" ? (
                  <p>Inicia una nueva partida con cartas aleatorias</p>
                ) : roomState.phase === "in-game" ? (
                  <>
                    <p><span className="text-white font-medium">REINICIAR:</span> Termina esta partida y empieza una nueva</p>
                    <p><span className="text-white font-medium">BARAJAR:</span> Cambia las cartas sin terminar la partida</p>
                  </>
                ) : (
                  <p>Termina la partida actual y empieza una nueva desde cero</p>
                )}
              </div>
            </div>

            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden pt-4 border-t border-white/5 grid grid-cols-2 gap-8"
                >
                  <div className="space-y-4">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-500">Deporte</label>
                    <div className="flex gap-2">
                      {["football", "basketball", "all"].map((s) => (
                        <button
                          key={s}
                          onClick={() => onUpdateSettings({ sport: s as RoomState["settings"]["sport"] })}
                          className={`flex-1 py-2 text-xs border transition-colors ${
                            roomState.settings.sport === s ? "bg-white text-black border-white" : "border-white/10 hover:border-white/30"
                          }`}
                        >
                          {s === "football" ? "FUT" : s === "basketball" ? "BAS" : "ALL"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-500">Impostores</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={roomState.settings.impostors}
                      onChange={(e) => onUpdateSettings({ impostors: Number(e.target.value) })}
                      className="w-full py-2 bg-transparent border-b border-white/10 text-center font-mono"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Desktop Players List when in-game */}
            {roomState.phase === "in-game" && (
              <div className="hidden md:block pt-6 border-t border-white/5">
                <div className="mb-4 text-[10px] uppercase tracking-widest text-neutral-500">Agentes Activos</div>
                {playersPanel}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

type CardRevealProps = {
  card: GameCard;
};

const CardReveal = React.forwardRef<{ closeCard: () => Promise<void> }, CardRevealProps>(({ card }, ref) => {
  const [revealed, setRevealed] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const confettiRef = useConfetti(card.isImpostor, showParticles);
  const prevCardIdRef = useRef<string | null>(null);

  // Resetear la carta cuando cambia el ID (nueva carta recibida del servidor)
  // El ID incluye timestamp, así que siempre será único para cada nueva carta
  useEffect(() => {
    if (prevCardIdRef.current !== null && prevCardIdRef.current !== card.id) {
      // Solo resetear si el ID realmente cambió (nueva carta)
      setRevealed(false);
      setShowParticles(false);
    }
    prevCardIdRef.current = card.id;
  }, [card.id]);

  const handleReveal = () => {
    if (!revealed) {
      setShowParticles(true);
      setTimeout(() => {
        setShowParticles(false);
      }, 2000);
    }
    setRevealed((v) => !v);
  };

  // Exponer función para cerrar la carta desde el componente padre
  useImperativeHandle(ref, () => ({
    closeCard: async () => {
      if (revealed) {
        setRevealed(false);
        setShowParticles(false);
        // Esperar a que termine la animación (600ms)
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    }
  }));

  return (
    <div className="relative perspective-1000">
      {showParticles && (
        <div
          ref={confettiRef}
          className="pointer-events-none fixed inset-0 z-[10000]"
          style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "100vw", height: "100vh" }}
        />
      )}
      
      <motion.div
        initial={false}
        animate={{ rotateY: revealed ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
        className="relative w-72 h-[450px] cursor-pointer preserve-3d"
        onClick={handleReveal}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Front (Hidden) */}
        <div className="absolute inset-0 backface-hidden bg-neutral-900 border border-white/10 p-2 rounded-sm">
          <div className="h-full w-full border border-dashed border-white/20 flex flex-col items-center justify-center gap-4 rounded-sm">
            <div className="w-16 h-16 sm:w-20 sm:h-20 border border-white/20 rounded-full flex items-center justify-center">
              <span className="text-xl sm:text-2xl">?</span>
            </div>
            <div className="text-center">
              <p className="text-[10px] sm:text-xs font-mono tracking-widest text-neutral-500">TU CARTA</p>
              <p className="text-[8px] sm:text-[10px] text-neutral-600 mt-2 uppercase">Tocá para ver tu carta</p>
            </div>
          </div>
        </div>

        {/* Back (Revealed) */}
        <div 
          className={`absolute inset-0 backface-hidden p-6 flex flex-col justify-between border transition-colors duration-500 rounded-sm ${
            card.isImpostor ? "bg-red-950/20 border-red-500/50" : "bg-emerald-950/20 border-emerald-500/50"
          }`}
          style={{ transform: "rotateY(180deg)" }}
        >
          <div className="flex justify-between items-start">
            <span className="font-mono text-[10px] opacity-50 tracking-widest">{card.isImpostor ? "IMPOSTOR" : "TRIPULACIÓN"}</span>
            <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${card.isImpostor ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
          </div>

          <div className="flex flex-col items-center gap-4 sm:gap-6 py-4 sm:py-8">
            {card.imageUrl && (
              <div className="relative w-24 h-24 sm:w-32 sm:h-32">
                <div className={`absolute inset-0 border rounded-full ${card.isImpostor ? "border-red-500/30" : "border-emerald-500/30"} animate-ping`} />
                <img 
                  src={card.imageUrl} 
                  className={`w-full h-full rounded-full object-cover border-2 ${card.isImpostor ? "border-red-500" : "border-emerald-500"}`}
                />
              </div>
            )}
            
            <div className="text-center space-y-1 sm:space-y-2">
              <h3 className="text-lg sm:text-2xl font-bold tracking-tight leading-tight">{card.playerName}</h3>
              <p className="text-xs sm:text-sm font-mono text-neutral-400">{card.team}</p>
              {card.funFact && !card.isImpostor && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-[10px] sm:text-xs text-neutral-500 italic leading-relaxed">
                    "{card.funFact}"
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className={`text-center py-3 border-t ${card.isImpostor ? "border-red-500/20 text-red-400" : "border-emerald-500/20 text-emerald-400"}`}>
            <p className="text-[8px] sm:text-[10px] uppercase tracking-[0.2em]">
              {card.isImpostor ? "SOS EL IMPOSTOR" : "ENCONTRÁ AL IMPOSTOR"}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
});

CardReveal.displayName = "CardReveal";

type PlayersPanelProps = {
  roomState: RoomState | null;
  me: string;
  isHost: boolean;
  onKick: (playerId: string) => void;
  onTransferHost: (playerId: string) => void;
  getAvatar: (playerName: string) => string;
};

function PlayersPanel({
  roomState,
  me,
  isHost,
  onKick,
  onTransferHost,
  getAvatar,
}: PlayersPanelProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-[10px] uppercase tracking-widest text-neutral-500 lg:hidden">Jugadores</h3>
      <div className="space-y-1">
        {roomState?.players.map((p) => {
          const isMe = p.name === me;
          const isCurrentHost = roomState.hostId === p.id;
          return (
            <div
              key={p.id}
              className={`group flex items-center justify-between p-3 border transition-all ${
                isMe ? "border-white bg-white/5" : "border-transparent hover:border-white/10 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <img 
                  src={getAvatar(p.name)} 
                  alt={p.name}
                  className="w-8 h-8 rounded-full border border-white/20 object-cover"
                />
                <div className="flex flex-col">
                  <span className={`text-sm ${isMe ? "text-white font-bold" : "text-neutral-400 group-hover:text-neutral-200"}`}>
                    {p.name}
                  </span>
                  {isCurrentHost && <span className="text-[8px] uppercase tracking-wider text-neutral-600">Anfitrión</span>}
                </div>
              </div>

              {isHost && !isMe && (
                <button
                  onClick={() => {
                    if (confirm(`¿Expulsar a ${p.name} de la sala?`)) {
                      onKick(p.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 text-[10px] text-red-500 hover:text-red-400 active:scale-95 transition-all px-2 py-1 border border-red-500/30 hover:border-red-500/50 rounded"
                >
                  EXPULSAR
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
