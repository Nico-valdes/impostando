"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export type GameCard = {
  id: string;
  playerName: string;
  team: string;
  sport: "football" | "basketball" | "custom" | "all";
  isImpostor: boolean;
  imageUrl?: string | null;
  funFact?: string | null;
};

export type RoomState = {
  code: string;
  locked: boolean;
  phase: "lobby" | "in-game" | "ended";
  hostId: string | null;
  settings: {
    sport: "football" | "basketball" | "all";
    maxPlayers: number;
    impostors: number;
    filters: {
      popularTeams: boolean;
      famousPlayers: boolean;
    };
    customCards: string[];
  };
  players: {
    id: string;
    name: string;
    avatarSeed?: string;
    isHost: boolean;
    joinedAt: number;
  }[];
  lastGame:
    | {
        startedAt: number;
        endedAt?: number;
        winner?: "crew" | "impostors";
      }
    | null;
};

export type ChatMessage = {
  id: string;
  from: string;
  fromId: string;
  text: string;
  ts: number;
};

type UseRoomSocketArgs = {
  roomCode: string;
  playerName: string;
  isHost: boolean;
  initialSettings: RoomState["settings"];
  avatarSeed?: string;
  onCardReceived?: (card: GameCard) => void;
  onGameEnded?: (
    summary: NonNullable<RoomState["lastGame"]>,
  ) => void;
};

export function useRoomSocket({
  roomCode,
  playerName,
  isHost,
  initialSettings,
  avatarSeed,
  onCardReceived,
  onGameEnded,
}: UseRoomSocketArgs) {
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [myCard, setMyCard] = useState<GameCard | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const onCardReceivedRef = useRef<UseRoomSocketArgs["onCardReceived"] | undefined>(undefined);
  const onGameEndedRef = useRef<UseRoomSocketArgs["onGameEnded"] | undefined>(undefined);
  const disconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDisconnectingRef = useRef(false);

  useEffect(() => {
    onCardReceivedRef.current = onCardReceived;
  }, [onCardReceived]);

  useEffect(() => {
    onGameEndedRef.current = onGameEnded;
  }, [onGameEnded]);

  useEffect(() => {
    const url =
      process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4000";

    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const connect = () => {
      const socket = io(`${url}/rooms/${roomCode}`, {
        transports: ["websocket"],
        query: {
          name: playerName,
          host: isHost ? "1" : "0",
          avatarSeed: avatarSeed || playerName || "default",
        },
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: maxReconnectAttempts,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("✅ Conectado al servidor de socket");
        setConnected(true);
        reconnectAttempts = 0;
        // Enviamos los settings iniciales solo una vez al conectar
        socket.emit("update_settings", initialSettings);
      });

      socket.on("connect_error", (error) => {
        console.error("❌ Error de conexión:", error.message);
        setConnected(false);
      });

      socket.on("disconnect", (reason) => {
        console.log("🔌 Desconectado:", reason);
        setConnected(false);
        if (reason === "io server disconnect") {
          // El servidor desconectó, intentar reconectar manualmente
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            reconnectTimer = setTimeout(() => {
              connect();
            }, 2000);
          }
        }
      });

      socket.on("reconnect_attempt", (attemptNumber) => {
        reconnectAttempts = attemptNumber;
      });

      socket.on("reconnect_failed", () => {
        console.error("No se pudo reconectar después de varios intentos");
      });

      socket.on("room_state", (state: RoomState) => {
        setRoomState(state);
      });

      socket.on("your_card", (card: GameCard) => {
        setMyCard(card);
        if (onCardReceivedRef.current) onCardReceivedRef.current(card);
      });

      socket.on("chat_message", (msg: ChatMessage) => {
        setMessages((prev) => [...prev, msg].slice(-80));
      });

      socket.on("game_ended", (summary) => {
        if (onGameEndedRef.current) onGameEndedRef.current(summary);
      });

      socket.on("kicked", () => {
        // Redirigir a la página principal después de mostrar el mensaje
        if (typeof window !== "undefined") {
          alert("Has sido expulsado de la sala por el host.");
          window.location.href = "/";
        }
      });

      socket.on("room_locked", () => {
        alert("La sala está bloqueada y no acepta nuevos jugadores.");
      });
    };

    connect();

    // Manejar desconexión diferida cuando la app está en segundo plano (móvil)
    const handleVisibilityChange = () => {
      if (typeof document === "undefined") return;
      
      if (document.hidden) {
        // La app está en segundo plano, iniciar timer de 2 minutos
        console.log("📱 App en segundo plano, iniciando timer de desconexión (2 min)");
        isDisconnectingRef.current = true;
        
        // Limpiar timer anterior si existe
        if (disconnectTimerRef.current) {
          clearTimeout(disconnectTimerRef.current);
        }
        
        // Desconectar después de 2 minutos
        disconnectTimerRef.current = setTimeout(() => {
          if (socketRef.current && isDisconnectingRef.current) {
            console.log("⏰ Timer expirado, desconectando...");
            socketRef.current.disconnect();
            setConnected(false);
            isDisconnectingRef.current = false;
          }
        }, 2 * 60 * 1000); // 2 minutos
      } else {
        // La app volvió a primer plano, cancelar desconexión
        if (disconnectTimerRef.current) {
          console.log("✅ App vuelta a primer plano, cancelando desconexión");
          clearTimeout(disconnectTimerRef.current);
          disconnectTimerRef.current = null;
          isDisconnectingRef.current = false;
          
          // Reconectar si se desconectó
          if (socketRef.current && !socketRef.current.connected) {
            console.log("🔄 Reconectando...");
            socketRef.current.connect();
          }
        }
      }
    };

    // Manejar cuando la ventana pierde el foco (desktop)
    const handleBlur = () => {
      if (typeof window === "undefined") return;
      // Solo aplicar en móvil o si no hay soporte para visibilitychange
      if (typeof document !== "undefined" && !document.hidden) {
        handleVisibilityChange();
      }
    };

    const handleFocus = () => {
      if (typeof window === "undefined") return;
      if (typeof document !== "undefined" && !document.hidden) {
        handleVisibilityChange();
      }
    };

    // Agregar listeners
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }
    if (typeof window !== "undefined") {
      window.addEventListener("blur", handleBlur);
      window.addEventListener("focus", handleFocus);
    }

    return () => {
      // Limpiar timers y listeners
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("blur", handleBlur);
        window.removeEventListener("focus", handleFocus);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      isDisconnectingRef.current = false;
    };
    // Solo debe recrearse cuando cambia realmente la identidad de la sala / jugador
  }, [roomCode, playerName, isHost, initialSettings]);

  const emit = (event: string, payload?: unknown) => {
    if (!socketRef.current) return;
    if (payload === undefined) socketRef.current.emit(event);
    else socketRef.current.emit(event, payload);
  };

  const updateSettings = (partial: Partial<RoomState["settings"]>) => {
    emit("update_settings", partial);
  };

  const updateAvatar = (seed: string) => {
    console.log("updateAvatar llamado con seed:", seed);
    emit("update_avatar", seed);
  };

  const startGame = () => emit("start_game");
  const reshuffle = () => emit("reshuffle_cards");
  const endGame = (winner: "crew" | "impostors") =>
    emit("end_game", winner);
  const lockRoom = (locked: boolean) => emit("lock_room", locked);
  const kickPlayer = (playerId: string) => {
    console.log("Expulsando jugador con ID:", playerId);
    emit("kick_player", playerId);
  };
  const transferHost = (playerId: string) =>
    emit("transfer_host", playerId);
  const sendChat = (text: string) =>
    emit("chat_message", { text });

  return {
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
  };
}


