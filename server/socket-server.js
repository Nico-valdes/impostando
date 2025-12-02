const http = require("http");
const { Server } = require("socket.io");

// Configuración básica del servidor HTTP + Socket.IO
const PORT = process.env.IMPOSTANDO_SOCKET_PORT || 4000;

/**
 * Estructura de sala en memoria
 * rooms: Map<string, Room>
 *
 * Room = {
 *   code: string;
 *   hostId: string | null;
 *   locked: boolean;
 *   players: Map<string, Player>;
 *   settings: {
 *     sport: "football" | "basketball" | "all";
 *     maxPlayers: number;
 *     impostors: number;
 *     filters: { popularTeams: boolean; famousPlayers: boolean };
 *     customCards: string[];
 *   };
 *   phase: "lobby" | "in-game" | "ended";
 *   lastGame?: {
 *     startedAt: number;
 *     endedAt?: number;
 *     winner?: "crew" | "impostors";
 *   };
 * }
 *
 * Player = {
 *   id: string; // socket.id
 *   name: string;
 *   joinedAt: number;
 *   isHost: boolean;
 * }
 */

const rooms = new Map();

const server = http.createServer();

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Datos de ejemplo / fallback para cartas
const SAMPLE_PLAYERS = {
  football: [
    { name: "Lionel Messi", team: "Inter Miami", sport: "football" },
    { name: "Kylian Mbappé", team: "Real Madrid", sport: "football" },
    { name: "Erling Haaland", team: "Manchester City", sport: "football" },
    { name: "Vinícius Jr.", team: "Real Madrid", sport: "football" },
    { name: "Kevin De Bruyne", team: "Manchester City", sport: "football" },
    { name: "Jude Bellingham", team: "Real Madrid", sport: "football" },
  ],
  basketball: [
    { name: "LeBron James", team: "Los Angeles Lakers", sport: "basketball" },
    { name: "Stephen Curry", team: "Golden State Warriors", sport: "basketball" },
    { name: "Giannis Antetokounmpo", team: "Milwaukee Bucks", sport: "basketball" },
    { name: "Nikola Jokić", team: "Denver Nuggets", sport: "basketball" },
    { name: "Luka Dončić", team: "Dallas Mavericks", sport: "basketball" },
    { name: "Jayson Tatum", team: "Boston Celtics", sport: "basketball" },
  ],
};

function getOrCreateRoom(roomCode) {
  const code = roomCode.toUpperCase();
  if (!rooms.has(code)) {
    rooms.set(code, {
      code,
      hostId: null,
      locked: false,
      players: new Map(),
      settings: {
        sport: "all",
        maxPlayers: 12,
        impostors: 1,
        filters: { popularTeams: true, famousPlayers: true },
        customCards: [],
      },
      phase: "lobby",
    });
  }
  return rooms.get(code);
}

function publicRoomState(room) {
  return {
    code: room.code,
    locked: room.locked,
    phase: room.phase,
    hostId: room.hostId,
    settings: room.settings,
    players: Array.from(room.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      joinedAt: p.joinedAt,
    })),
    lastGame: room.lastGame || null,
  };
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

async function buildDeckForRoom(room) {
  const settings = room.settings;

  let pool = [];
  if (settings.sport === "football" || settings.sport === "all") {
    pool = pool.concat(SAMPLE_PLAYERS.football);
  }
  if (settings.sport === "basketball" || settings.sport === "all") {
    pool = pool.concat(SAMPLE_PLAYERS.basketball);
  }

  // Intento de añadir jugadores NBA desde balldontlie como ejemplo de API pública
  if (settings.sport === "basketball" || settings.sport === "all") {
    try {
      const res = await fetch(
        "https://api.balldontlie.io/v1/players?per_page=25&page=1",
      );
      if (res.ok) {
        const data = await res.json();
        const apiPlayers =
          data.data?.map((p) => ({
            name: `${p.first_name} ${p.last_name}`,
            team: p.team?.full_name || "Unknown",
            sport: "basketball",
          })) ?? [];
        pool = pool.concat(apiPlayers);
      }
    } catch (e) {
      // Si la API falla, seguimos con los datos locales
    }
  }

  if (settings.customCards && settings.customCards.length > 0) {
    const custom = settings.customCards.map((label) => ({
      name: label,
      team: "Custom",
      sport: settings.sport === "all" ? "custom" : settings.sport,
    }));
    pool = pool.concat(custom);
  }

  if (pool.length === 0) {
    pool = SAMPLE_PLAYERS.football.concat(SAMPLE_PLAYERS.basketball);
  }

  const playersArray = Array.from(room.players.values());
  const totalPlayers = playersArray.length;
  const impostorsCount = Math.min(
    Math.max(1, settings.impostors || 1),
    Math.max(1, totalPlayers - 1),
  );

  const impostorIndexes = new Set();
  while (impostorIndexes.size < impostorsCount) {
    impostorIndexes.add(getRandomInt(totalPlayers));
  }

  const deck = {};

  playersArray.forEach((player, index) => {
    const cardIndex = getRandomInt(pool.length);
    const base = pool[cardIndex];
    deck[player.id] = {
      id: `${room.code}-${player.id}`,
      playerName: base.name,
      team: base.team,
      sport: base.sport,
      isImpostor: impostorIndexes.has(index),
    };
  });

  return deck;
}

// Namespaces dinámicos por sala: /rooms/ABCDE
io.of(/^\/rooms\/\w{5}$/).on("connection", (socket) => {
  const namespace = socket.nsp;
  const roomCode = namespace.name.split("/").pop().toUpperCase();
  const room = getOrCreateRoom(roomCode);

  const { name, host } = socket.handshake.query;
  const playerName = typeof name === "string" ? name.slice(0, 24) : "Jugador";
  const wantsHost = host === "1" || host === "true";

  if (room.locked && !room.players.has(socket.id)) {
    socket.emit("room_locked");
    socket.disconnect(true);
    return;
  }

  const isFirst = room.players.size === 0;
  const isHost = isFirst || (wantsHost && !room.hostId);

  const player = {
    id: socket.id,
    name: playerName,
    joinedAt: Date.now(),
    isHost,
  };

  room.players.set(socket.id, player);
  if (isHost || !room.hostId) {
    room.hostId = socket.id;
  }

  namespace.emit("room_state", publicRoomState(room));

  socket.on("update_settings", (settings) => {
    if (socket.id !== room.hostId) return;
    room.settings = {
      ...room.settings,
      ...settings,
      filters: {
        ...room.settings.filters,
        ...(settings.filters || {}),
      },
      customCards: Array.isArray(settings.customCards)
        ? settings.customCards
        : room.settings.customCards,
    };
    namespace.emit("room_state", publicRoomState(room));
  });

  socket.on("lock_room", (locked) => {
    if (socket.id !== room.hostId) return;
    room.locked = !!locked;
    namespace.emit("room_state", publicRoomState(room));
  });

  socket.on("start_game", async () => {
    if (socket.id !== room.hostId) return;
    if (room.players.size < 3) {
      socket.emit("error_message", "Se necesitan al menos 3 jugadores.");
      return;
    }

    room.phase = "in-game";
    room.lastGame = { startedAt: Date.now() };

    const deck = await buildDeckForRoom(room);

    namespace.emit("room_state", publicRoomState(room));

    Object.entries(deck).forEach(([socketId, card]) => {
      const target = namespace.sockets.get(socketId);
      if (target) {
        target.emit("your_card", card);
      }
    });
  });

  socket.on("reshuffle_cards", async () => {
    if (socket.id !== room.hostId) return;
    if (room.phase !== "in-game") return;
    const deck = await buildDeckForRoom(room);
    Object.entries(deck).forEach(([socketId, card]) => {
      const target = namespace.sockets.get(socketId);
      if (target) {
        target.emit("your_card", card);
      }
    });
  });

  socket.on("end_game", (winner) => {
    if (socket.id !== room.hostId) return;
    room.phase = "ended";
    if (!room.lastGame) room.lastGame = { startedAt: Date.now() };
    room.lastGame.endedAt = Date.now();
    room.lastGame.winner =
      winner === "impostors" || winner === "crew" ? winner : "crew";
    namespace.emit("game_ended", room.lastGame);
    namespace.emit("room_state", publicRoomState(room));
  });

  socket.on("chat_message", (payload) => {
    const text =
      typeof payload?.text === "string" ? payload.text.slice(0, 240) : "";
    if (!text) return;
    const message = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      from: player.name,
      fromId: player.id,
      text,
      ts: Date.now(),
    };
    namespace.emit("chat_message", message);
  });

  socket.on("kick_player", (targetId) => {
    if (socket.id !== room.hostId) return;
    if (!targetId || typeof targetId !== "string") return;
    if (!room.players.has(targetId)) return;
    const targetSocket = namespace.sockets.get(targetId);
    if (targetSocket) {
      targetSocket.emit("kicked");
      targetSocket.disconnect(true);
    }
  });

  socket.on("transfer_host", (targetId) => {
    if (socket.id !== room.hostId) return;
    if (!room.players.has(targetId)) return;
    room.hostId = targetId;
    room.players.forEach((p, id) => {
      p.isHost = id === targetId;
    });
    namespace.emit("room_state", publicRoomState(room));
  });

  socket.on("disconnect", () => {
    room.players.delete(socket.id);

    if (room.players.size === 0) {
      rooms.delete(room.code);
      return;
    }

    if (room.hostId === socket.id) {
      const [nextHost] = room.players.values();
      if (nextHost) {
        nextHost.isHost = true;
        room.hostId = nextHost.id;
      } else {
        room.hostId = null;
      }
    }

    namespace.emit("room_state", publicRoomState(room));
  });
});

server.listen(PORT, () => {
  console.log(`Impostando Socket.IO server escuchando en puerto ${PORT}`);
});


