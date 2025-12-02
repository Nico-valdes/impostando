"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRoomSocket, type RoomState, type GameCard, type ChatMessage } from "../../../hooks/useRoomSocket";
import { usePlayerStats } from "../../../hooks/usePlayerStats";

type PageProps = {
  params: { code: string };
};

export default function RoomPage({ params }: PageProps) {
  const searchParams = useSearchParams();
  const roomCode = params.code.toUpperCase();
  const playerName = (searchParams.get("name") || "Jugador").slice(0, 24);
  const isHost =
    searchParams.get("host") === "1" || searchParams.get("host") === "true";

  const initialSettings = useMemo(
    () => ({
      sport: (searchParams.get("sport") as RoomState["settings"]["sport"]) || "all",
      maxPlayers: Number(searchParams.get("maxPlayers")) || 10,
      impostors: Number(searchParams.get("impostors")) || 2,
      filters: {
        popularTeams: searchParams.get("popularTeams") !== "0",
        famousPlayers: searchParams.get("famousPlayers") !== "0",
      },
      customCards: (() => {
        const raw = searchParams.get("customCards");
        if (!raw) return [];
        try {
          const parsed = JSON.parse(decodeURIComponent(raw));
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })(),
    }),
    [searchParams],
  );

  const { stats, registerGameStart, registerGameEnd } = usePlayerStats(playerName);

  const {
    connected,
    roomState,
    myCard,
    messages,
    sendChat,
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
    },
    onGameEnded: (summary) => {
      registerGameEnd(summary);
    },
  });

  const [chatText, setChatText] = useState("");

  useEffect(() => {
    if (!roomState && connected) return;
  }, [roomState, connected]);

  const iAmHost = roomState?.hostId && roomState.hostId === roomState.players.find((p) => p.name === playerName)?.id;

  const handleSendChat = () => {
    const text = chatText.trim();
    if (!text) return;
    sendChat(text);
    setChatText("");
  };

  const phase = roomState?.phase || "lobby";

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-950/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-xs font-black tracking-tight text-slate-950">
              IM
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="font-semibold text-slate-100">
                  Sala {roomCode}
                </span>
                <span className="h-1 w-1 rounded-full bg-slate-600" />
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    connected
                      ? "bg-emerald-500/10 text-emerald-300"
                      : "bg-red-500/10 text-red-300"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      connected ? "bg-emerald-400" : "bg-red-400"
                    }`}
                  />
                  {connected ? "Conectado" : "Reconectando..."}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Jugando como{" "}
                <span className="font-semibold text-slate-100">
                  {playerName}
                </span>
              </p>
            </div>
          </div>

          {roomState && (
            <div className="flex items-center gap-4 text-[11px] text-slate-300">
              <span>
                Jugadores:{" "}
                <span className="font-semibold">
                  {roomState.players.length}/{roomState.settings.maxPlayers}
                </span>
              </span>
              <span>
                Impostores:{" "}
                <span className="font-semibold">
                  {roomState.settings.impostors}
                </span>
              </span>
              <span className="hidden sm:inline">
                Deporte:{" "}
                <span className="font-semibold capitalize">
                  {roomState.settings.sport === "all"
                    ? "Mixto"
                    : roomState.settings.sport === "football"
                    ? "Fútbol"
                    : "Básquet"}
                </span>
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-4 md:flex-row">
        <section className="flex-1 space-y-4">
          <LobbyOrGameView
            roomState={roomState}
            myCard={myCard}
            isHost={!!iAmHost}
            onUpdateSettings={updateSettings}
            onStartGame={startGame}
            onReshuffle={reshuffle}
            onEndGame={endGame}
            onLockRoom={lockRoom}
          />

          <StatsPanel stats={stats} />
        </section>

        <aside className="flex w-full flex-col gap-4 md:w-80">
          <PlayersPanel
            roomState={roomState}
            me={playerName}
            isHost={!!iAmHost}
            onKick={kickPlayer}
            onTransferHost={transferHost}
          />

          <ChatPanel
            messages={messages}
            value={chatText}
            onChange={setChatText}
            onSend={handleSendChat}
          />
        </aside>
      </main>

      <footer className="border-t border-slate-800 bg-slate-950/80 px-4 py-2 text-center text-[11px] text-slate-500">
        Comparte este link con tus amigos para unirse:{" "}
        <span className="font-mono text-slate-300">
          {typeof window !== "undefined"
            ? window.location.href
            : `.../room/${roomCode}`}
        </span>
      </footer>
    </div>
  );
}

type LobbyProps = {
  roomState: RoomState | null;
  myCard: GameCard | null;
  isHost: boolean;
  onUpdateSettings: (partial: Partial<RoomState["settings"]>) => void;
  onStartGame: () => void;
  onReshuffle: () => void;
  onEndGame: (winner: "crew" | "impostors") => void;
  onLockRoom: (locked: boolean) => void;
};

function LobbyOrGameView({
  roomState,
  myCard,
  isHost,
  onUpdateSettings,
  onStartGame,
  onReshuffle,
  onEndGame,
  onLockRoom,
}: LobbyProps) {
  if (!roomState) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/70">
        <span className="text-sm text-slate-400">
          Conectando a la sala...
        </span>
      </div>
    );
  }

  const canStart = roomState.players.length >= 3;

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-50">
            {roomState.phase === "lobby"
              ? "Lobby de partida"
              : roomState.phase === "in-game"
              ? "Partida en curso"
              : "Partida finalizada"}
          </h2>
          {isHost && (
            <button
              type="button"
              onClick={() => onLockRoom(!roomState.locked)}
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                roomState.locked
                  ? "border border-amber-400/70 bg-amber-500/10 text-amber-200"
                  : "border border-slate-700 bg-slate-900/80 text-slate-200 hover:border-emerald-400 hover:text-emerald-200"
              }`}
            >
              {roomState.locked ? "Sala bloqueada" : "Bloquear nuevos ingresos"}
            </button>
          )}
        </div>

        <p className="text-xs text-slate-400">
          Espera a que entren todos tus amigos. Cuando el host inicie, cada uno
          recibirá una carta secreta con su rol.
        </p>

        {isHost && (
          <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-300">
                Deporte
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {["football", "basketball", "all"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        sport: s as RoomState["settings"]["sport"],
                      })
                    }
                    className={`rounded-xl border px-2 py-1 text-[11px] transition ${
                      roomState.settings.sport === s
                        ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                        : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {s === "football"
                      ? "Fútbol"
                      : s === "basketball"
                      ? "Básquet"
                      : "Mixto"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-300">
                Impostores
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={roomState.settings.impostors}
                onChange={(e) =>
                  onUpdateSettings({
                    impostors: Math.min(
                      5,
                      Math.max(1, Number(e.target.value) || 1),
                    ),
                  })
                }
                className="w-20 rounded-xl border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs outline-none ring-emerald-500/60 transition focus:border-emerald-400 focus:ring-2"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-300">
                Filtros
              </label>
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-[11px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={roomState.settings.filters.popularTeams}
                    onChange={(e) =>
                      onUpdateSettings({
                        filters: {
                          ...roomState.settings.filters,
                          popularTeams: e.target.checked,
                        },
                      })
                    }
                    className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-emerald-400 focus:ring-emerald-500"
                  />
                  Equipos populares
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={roomState.settings.filters.famousPlayers}
                    onChange={(e) =>
                      onUpdateSettings({
                        filters: {
                          ...roomState.settings.filters,
                          famousPlayers: e.target.checked,
                        },
                      })
                    }
                    className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-emerald-400 focus:ring-emerald-500"
                  />
                  Jugadores famosos
                </label>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-300">
                Control de sala
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!canStart}
                  onClick={onStartGame}
                  className={`rounded-xl px-3 py-1.5 text-[11px] font-semibold transition ${
                    canStart
                      ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow shadow-emerald-500/40 hover:brightness-110"
                      : "cursor-not-allowed bg-slate-800 text-slate-500"
                  }`}
                >
                  Iniciar partida
                </button>
                {roomState.phase === "in-game" && (
                  <button
                    type="button"
                    onClick={onReshuffle}
                    className="rounded-xl border border-violet-400/70 bg-violet-500/10 px-3 py-1.5 text-[11px] font-medium text-violet-100 transition hover:border-violet-300"
                  >
                    Barajar de nuevo
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {roomState.phase === "in-game" && myCard && (
          <div className="mt-3">
            <CardReveal card={myCard} />
          </div>
        )}

        {roomState.phase === "ended" && roomState.lastGame && isHost && (
          <div className="mt-3 space-y-2 rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-[11px] text-slate-300">
            <p className="font-medium text-slate-200">
              ¿Quién ganó esta partida?
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onEndGame("crew")}
                className="rounded-xl border border-emerald-400/70 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-medium text-emerald-100 transition hover:border-emerald-300"
              >
                Tripulación
              </button>
              <button
                type="button"
                onClick={() => onEndGame("impostors")}
                className="rounded-xl border border-red-400/70 bg-red-500/10 px-3 py-1.5 text-[11px] font-medium text-red-100 transition hover:border-red-300"
              >
                Impostores
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Tu carta secreta
        </h3>
        <div className="flex flex-1 items-center justify-center">
          {roomState.phase === "in-game" && myCard ? (
            <CardReveal card={myCard} />
          ) : (
            <p className="max-w-xs text-center text-xs text-slate-400">
              Aún no tienes carta asignada. Cuando el host inicie la partida,
              podrás revelar aquí tu rol.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

type CardRevealProps = {
  card: GameCard;
};

function CardReveal({ card }: CardRevealProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex flex-col items-center gap-3">
      <AnimatePresence initial={false}>
        <motion.div
          key={revealed ? "front" : "back"}
          initial={{ rotateY: revealed ? 180 : -180, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          exit={{ rotateY: revealed ? -180 : 180, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className={`relative h-52 w-36 cursor-pointer rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-[2px] shadow-xl shadow-emerald-500/20`}
          onClick={() => setRevealed((v) => !v)}
        >
          <div className="relative flex h-full w-full flex-col justify-between rounded-[14px] bg-slate-950/95 p-3">
            {!revealed ? (
              <>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold text-slate-100">
                    Carta secreta
                  </span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-slate-300">
                    Tap para ver
                  </span>
                </div>
                <div className="flex flex-1 items-center justify-center">
                  <div className="h-16 w-16 rounded-full border border-dashed border-slate-700 bg-slate-900/80" />
                </div>
                <p className="text-center text-[11px] text-slate-400">
                  Haz click para revelar tu carta. No se la muestres a nadie.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold text-slate-100">
                    {card.sport === "football"
                      ? "Fútbol"
                      : card.sport === "basketball"
                      ? "Básquet"
                      : "Especial"}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] ${
                      card.isImpostor
                        ? "bg-red-500/10 text-red-300"
                        : "bg-emerald-500/10 text-emerald-300"
                    }`}
                  >
                    {card.isImpostor ? "Impostor" : "Tripulación"}
                  </span>
                </div>
                <div className="mt-2 space-y-2">
                  <p className="text-sm font-semibold text-slate-50">
                    {card.playerName}
                  </p>
                  <p className="text-[11px] text-slate-300">{card.team}</p>
                </div>
                <p className="mt-auto text-[10px] text-slate-500">
                  {card.isImpostor
                    ? "Tu objetivo es mezclarte con el resto y no levantar sospechas."
                    : "Tu objetivo es descubrir quién está mintiendo sin revelar tu carta."}
                </p>
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setRevealed((v) => !v)}
        className="rounded-full border border-slate-700 bg-slate-900/80 px-4 py-1.5 text-[11px] font-medium text-slate-200 transition hover:border-emerald-400 hover:text-emerald-200"
      >
        {revealed ? "Volver a ocultar" : "Revelar carta"}
      </button>
    </div>
  );
}

type PlayersPanelProps = {
  roomState: RoomState | null;
  me: string;
  isHost: boolean;
  onKick: (playerId: string) => void;
  onTransferHost: (playerId: string) => void;
};

function PlayersPanel({
  roomState,
  me,
  isHost,
  onKick,
  onTransferHost,
}: PlayersPanelProps) {
  return (
    <div className="flex flex-1 flex-col rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
      <div className="mb-2 flex items-center justify-between text-xs">
        <h3 className="font-semibold text-slate-50">Jugadores</h3>
        <span className="text-[11px] text-slate-400">
          {roomState
            ? `${roomState.players.length}/${roomState.settings.maxPlayers}`
            : "0/?"}
        </span>
      </div>
      <div className="flex-1 space-y-1.5 overflow-auto text-xs">
        {roomState ? (
          roomState.players.map((p) => {
            const isMe = p.name === me;
            const isCurrentHost = roomState.hostId === p.id;
            return (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-1.5"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      isCurrentHost
                        ? "bg-emerald-400"
                        : "bg-slate-600"
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-[11px] ${
                          isMe ? "font-semibold text-slate-50" : "text-slate-100"
                        }`}
                      >
                        {p.name}
                      </span>
                      {isMe && (
                        <span className="rounded-full bg-slate-800 px-2 py-[2px] text-[9px] text-slate-300">
                          Tú
                        </span>
                      )}
                      {isCurrentHost && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-[2px] text-[9px] text-emerald-300">
                          Host
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Desde {new Date(p.joinedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {isHost && !isMe && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onTransferHost(p.id)}
                      className="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[9px] text-slate-300 transition hover:border-emerald-400 hover:text-emerald-200"
                    >
                      Hacer host
                    </button>
                    <button
                      type="button"
                      onClick={() => onKick(p.id)}
                      className="rounded-full border border-red-500/60 bg-red-500/10 px-2 py-0.5 text-[9px] text-red-200 transition hover:border-red-300"
                    >
                      Kick
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-[11px] text-slate-400">
            Esperando información de la sala...
          </p>
        )}
      </div>
    </div>
  );
}

type ChatPanelProps = {
  messages: ChatMessage[];
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
};

function ChatPanel({ messages, value, onChange, onSend }: ChatPanelProps) {
  return (
    <div className="flex h-72 flex-col rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
      <h3 className="mb-1 text-xs font-semibold text-slate-50">
        Chat de la sala
      </h3>
      <div className="flex-1 space-y-1.5 overflow-auto rounded-xl border border-slate-800 bg-slate-950/80 p-2 text-[11px]">
        {messages.length === 0 ? (
          <p className="text-[11px] text-slate-500">
            Aún no hay mensajes. Empieza la conversación.
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-slate-100">
                  {m.from}
                </span>
                <span className="text-[9px] text-slate-500">
                  {new Date(m.ts).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-[11px] text-slate-200">{m.text}</p>
            </div>
          ))
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSend();
            }
          }}
          className="flex-1 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-xs outline-none ring-cyan-500/60 transition focus:border-cyan-400 focus:ring-2"
          placeholder="Escribe un mensaje..."
        />
        <button
          type="button"
          onClick={onSend}
          className="rounded-xl bg-cyan-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 shadow shadow-cyan-500/40 transition hover:brightness-110"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}

type StatsPanelProps = {
  stats: ReturnType<typeof usePlayerStats>["stats"];
};

function StatsPanel({ stats }: StatsPanelProps) {
  const totalGames = stats.gamesPlayed;
  const winRate =
    totalGames > 0 ? Math.round((stats.wins / totalGames) * 100) : 0;

  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-xs text-slate-200">
      <h3 className="mb-2 text-xs font-semibold text-slate-50">
        Tus estadísticas
      </h3>
      {totalGames === 0 ? (
        <p className="text-[11px] text-slate-400">
          Juega algunas partidas para empezar a ver tus estadísticas aquí.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <p className="text-[11px] text-slate-400">Partidas jugadas</p>
            <p className="text-lg font-semibold">{totalGames}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Veces impostor</p>
            <p className="text-lg font-semibold">{stats.impostorCount}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Winrate</p>
            <p className="text-lg font-semibold">{winRate}%</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Deporte más jugado</p>
            <p className="text-xs font-semibold">
              {stats.mostPlayedSport ?? "-"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}


