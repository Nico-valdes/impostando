"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRoomSocket, type RoomState, type GameCard } from "../../../hooks/useRoomSocket";
import { usePlayerStats } from "../../../hooks/usePlayerStats";
import { useConfetti } from "../../../hooks/useConfetti";
import { useNotifications } from "../../../hooks/useNotifications";
import { useAvatar } from "../../../hooks/useAvatar";
import { useShare } from "../../../hooks/useShare";

export default function RoomPage() {
  const searchParams = useSearchParams();
  const params = useParams<{ code: string }>();
  const roomCode = (params.code ?? "").toUpperCase();
  const playerName = (searchParams.get("name") || "Jugador").slice(0, 24);
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
  const { avatar, changeAvatar, availableAvatars } = useAvatar(playerName);
  const { share, copied } = useShare();
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [previousPhase, setPreviousPhase] = useState<RoomState["phase"] | null>(null);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const success = await share(url, "Únete a mi partida de Impostando");
    if (success && !copied) {
      notify("Link compartido");
    } else if (success && copied) {
      notify("Link copiado");
    }
  };

  const {
    connected,
    roomState,
    myCard,
    updateSettings,
    startGame,
    reshuffle,
    endGame,
    lockRoom,
    kickPlayer,
    transferHost,
  } = useRoomSocket({
    roomCode,
    playerName,
    isHost,
    initialSettings,
    onCardReceived: (card) => {
      registerGameStart(card);
      notify(card.isImpostor ? "🎭 Eres el impostor" : "✅ Eres tripulación");
    },
    onGameEnded: (summary) => {
      registerGameEnd(summary);
      notify(summary.winner === "crew" ? "✅ Ganó la tripulación" : "🎭 Ganaron los impostores");
    },
  });

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
                <span className="hidden sm:block text-[10px] tracking-widest text-neutral-500 uppercase">Protocolo</span>
                <span className="font-mono text-sm tracking-wider">{roomCode}</span>
              </div>
            </div>
            
            <div className="h-6 w-px bg-white/10 hidden sm:block" />
            
            <div className="relative">
              <button 
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="group flex items-center gap-2 hover:bg-white/5 px-2 sm:px-3 py-1.5 transition-colors rounded-sm"
              >
                <span className="text-lg">{avatar}</span>
                <span className="text-xs text-neutral-400 group-hover:text-white transition-colors max-w-[80px] truncate hidden sm:block">{playerName}</span>
              </button>
              
              {showAvatarPicker && (
                <div className="absolute top-full left-0 mt-2 p-2 glass-panel w-64 grid grid-cols-6 gap-1 z-50">
                  {availableAvatars.map(av => (
                    <button
                      key={av}
                      onClick={(e) => { e.stopPropagation(); changeAvatar(av); setShowAvatarPicker(false); }}
                      className="p-2 hover:bg-white/10 transition-colors rounded-sm"
                    >
                      {av}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden md:flex items-center gap-4 text-xs font-mono text-neutral-500">
              <span className={`flex items-center gap-2 ${connected ? "text-emerald-500" : "text-red-500"}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {connected ? "ONLINE" : "OFFLINE"}
              </span>
              <span>{roomState?.players.length ?? 0} AGENTES</span>
            </div>
            
            <button 
              onClick={handleShare}
              className="btn-secondary px-3 py-1.5 sm:px-4 sm:py-1.5 text-[10px] uppercase tracking-widest flex items-center gap-2"
            >
              <span className="sm:inline hidden">{copied ? "Copiado" : "Invitar"}</span>
              <span className="sm:hidden text-base">🔗</span>
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
                    if (name === playerName) return avatar;
                    if (typeof window !== "undefined") return localStorage.getItem(`avatar_${name}`) || "😀";
                    return "😀";
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
                if (name === playerName) return avatar;
                if (typeof window !== "undefined") return localStorage.getItem(`avatar_${name}`) || "😀";
                return "😀";
              }}
            />
          </aside>

        </div>
      </main>
      
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
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
  playersPanel: React.ReactNode;
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

  if (!roomState) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="h-full flex flex-col items-center justify-center space-y-4 text-neutral-500"
      >
        <div className="w-12 h-12 border-t-2 border-l-2 border-white animate-spin" />
        <span className="text-xs uppercase tracking-widest">Estableciendo conexión segura...</span>
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
            <span className="text-[10px] uppercase tracking-widest text-neutral-500">Estado de la misión</span>
            <span className="text-xl font-light text-white">
              {roomState.phase === "lobby" ? "PREPARACIÓN" : roomState.phase === "in-game" ? "EN PROGRESO" : "FINALIZADO"}
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
            <CardReveal card={myCard} />
          ) : roomState.phase === "lobby" ? (
            <div className="text-center space-y-4 opacity-50">
              <div className="text-4xl sm:text-6xl font-thin">WAITING</div>
              <p className="text-xs sm:text-sm font-mono tracking-widest">ESPERANDO INICIO DE PROTOCOLO</p>
            </div>
          ) : (
            <div className="glass-panel p-6 sm:p-8 w-full max-w-md mx-auto text-center space-y-6">
              <h3 className="text-xs sm:text-sm uppercase tracking-widest text-neutral-400">Resultado de la Misión</h3>
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
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-500">Panel de Control</span>
              <button 
                onClick={() => setShowSettings(!showSettings)} 
                className="text-[10px] sm:text-xs hover:text-white transition-colors border-b border-transparent hover:border-white pb-0.5"
              >
                {showSettings ? "CERRAR" : "CONFIGURACIÓN"}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                disabled={!canStart}
                onClick={onStartGame}
                className={`flex-1 py-3 sm:py-4 text-xs sm:text-sm uppercase tracking-widest font-bold transition-all ${
                  canStart ? "btn-primary" : "opacity-50 cursor-not-allowed border border-white/10 bg-white/5 text-neutral-500"
                }`}
              >
                {roomState.phase === "lobby" ? "INICIAR SECUENCIA" : "REINICIAR"}
              </button>
              
              {roomState.phase === "in-game" && (
                <button onClick={onReshuffle} className="btn-secondary px-6 py-3 sm:py-4 text-xs sm:text-sm uppercase tracking-widest">
                  BARAJAR
                </button>
              )}
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
                          onClick={() => onUpdateSettings({ sport: s as any })}
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

function CardReveal({ card }: CardRevealProps) {
  const [revealed, setRevealed] = useState(false);
  const [justRevealed, setJustRevealed] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const confettiRef = useConfetti(card.isImpostor, showParticles);

  const handleReveal = () => {
    if (!revealed) {
      setJustRevealed(true);
      setShowParticles(true);
      setTimeout(() => {
        setJustRevealed(false);
        setShowParticles(false);
      }, 2000);
    }
    setRevealed((v) => !v);
  };

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
          <div className="h-full w-full border border-dashed border-white/20 flex flex-col items-center justify-center gap-4 bg-[url('/noise.png')] rounded-sm">
            <div className="w-16 h-16 sm:w-20 sm:h-20 border border-white/20 rounded-full flex items-center justify-center">
              <span className="text-xl sm:text-2xl">?</span>
            </div>
            <div className="text-center">
              <p className="text-[10px] sm:text-xs font-mono tracking-widest text-neutral-500">CONFIDENCIAL</p>
              <p className="text-[8px] sm:text-[10px] text-neutral-600 mt-2 uppercase">Tocar para descifrar</p>
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
            <span className="font-mono text-[10px] opacity-50 tracking-widest">{card.isImpostor ? "ERR_404" : "AUTH_OK"}</span>
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
            </div>
          </div>

          <div className={`text-center py-3 border-t ${card.isImpostor ? "border-red-500/20 text-red-400" : "border-emerald-500/20 text-emerald-400"}`}>
            <p className="text-[8px] sm:text-[10px] uppercase tracking-[0.2em]">
              {card.isImpostor ? "OBJETIVO: INFILTRARSE" : "OBJETIVO: DETECTAR"}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

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
      <h3 className="text-[10px] uppercase tracking-widest text-neutral-500 lg:hidden">Agentes</h3>
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
                <div className="w-8 h-8 flex items-center justify-center bg-white/5 text-lg">
                  {getAvatar(p.name)}
                </div>
                <div className="flex flex-col">
                  <span className={`text-sm ${isMe ? "text-white font-bold" : "text-neutral-400 group-hover:text-neutral-200"}`}>
                    {p.name}
                  </span>
                  {isCurrentHost && <span className="text-[8px] uppercase tracking-wider text-neutral-600">Líder de Escuadrón</span>}
                </div>
              </div>

              {isHost && !isMe && (
                <button
                  onClick={() => onKick(p.id)}
                  className="opacity-0 group-hover:opacity-100 text-[10px] text-red-500 hover:underline transition-opacity"
                >
                  ELIMINAR
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
