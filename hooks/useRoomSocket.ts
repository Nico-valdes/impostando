\"use client\";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export type GameCard = {
  id: string;
  playerName: string;
  team: string;
  sport: "football" | "basketball" | "custom" | "all";
  isImpostor: boolean;
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
  onCardReceived,
  onGameEnded,
}: UseRoomSocketArgs) {
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [myCard, setMyCard] = useState<GameCard | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const url =
      process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4000";

    const socket = io(`${url}/rooms/${roomCode}`, {
      transports: ["websocket"],
      query: {
        name: playerName,
        host: isHost ? "1" : "0",
      },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("room_state", (state: RoomState) => {
      setRoomState(state);
    });

    socket.on("your_card", (card: GameCard) => {
      setMyCard(card);
      if (onCardReceived) onCardReceived(card);
    });

    socket.on("chat_message", (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg].slice(-80));
    });

    socket.on("game_ended", (summary) => {
      if (onGameEnded) onGameEnded(summary);
    });

    socket.on("kicked", () => {
      alert("Has sido expulsado de la sala por el host.");
    });

    socket.on("room_locked", () => {
      alert("La sala está bloqueada y no acepta nuevos jugadores.");
    });

    socket.emit("update_settings", initialSettings);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomCode, playerName, isHost, initialSettings, onCardReceived, onGameEnded]);

  const emit = (event: string, payload?: unknown) => {
    if (!socketRef.current) return;
    if (payload === undefined) socketRef.current.emit(event);
    else socketRef.current.emit(event, payload);
  };

  const updateSettings = (partial: Partial<RoomState["settings"]>) => {
    emit("update_settings", partial);
  };

  const startGame = () => emit("start_game");
  const reshuffle = () => emit("reshuffle_cards");
  const endGame = (winner: "crew" | "impostors") =>
    emit("end_game", winner);
  const lockRoom = (locked: boolean) => emit("lock_room", locked);
  const kickPlayer = (playerId: string) => emit("kick_player", playerId);
  const transferHost = (playerId: string) =>
    emit("transfer_host", playerId);
  const sendChat = (text: string) =>
    emit("chat_message", { text });

  return {
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
  };
}


