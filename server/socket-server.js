const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

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
    {
      name: "Lionel Messi",
      team: "Inter Miami",
      sport: "football",
      imageUrl:
        "https://ui-avatars.com/api/?background=0F172A&color=fff&name=Lionel+Messi",
    },
    {
      name: "Kylian Mbappé",
      team: "Real Madrid",
      sport: "football",
      imageUrl:
        "https://ui-avatars.com/api/?background=0F172A&color=fff&name=Kylian+Mbapp%C3%A9",
    },
    {
      name: "Erling Haaland",
      team: "Manchester City",
      sport: "football",
      imageUrl:
        "https://ui-avatars.com/api/?background=0F172A&color=fff&name=Erling+Haaland",
    },
    {
      name: "Vinícius Jr.",
      team: "Real Madrid",
      sport: "football",
      imageUrl:
        "https://ui-avatars.com/api/?background=0F172A&color=fff&name=Vinicius+Jr",
    },
    {
      name: "Kevin De Bruyne",
      team: "Manchester City",
      sport: "football",
      imageUrl:
        "https://ui-avatars.com/api/?background=0F172A&color=fff&name=Kevin+De+Bruyne",
    },
    {
      name: "Jude Bellingham",
      team: "Real Madrid",
      sport: "football",
      imageUrl:
        "https://ui-avatars.com/api/?background=0F172A&color=fff&name=Jude+Bellingham",
    },
  ],
  basketball: [
    {
      name: "LeBron James",
      team: "Los Angeles Lakers",
      sport: "basketball",
      imageUrl:
        "https://ui-avatars.com/api/?background=111827&color=fff&name=LeBron+James",
    },
    {
      name: "Stephen Curry",
      team: "Golden State Warriors",
      sport: "basketball",
      imageUrl:
        "https://ui-avatars.com/api/?background=111827&color=fff&name=Stephen+Curry",
    },
    {
      name: "Giannis Antetokounmpo",
      team: "Milwaukee Bucks",
      sport: "basketball",
      imageUrl:
        "https://ui-avatars.com/api/?background=111827&color=fff&name=Giannis+Antetokounmpo",
    },
    {
      name: "Nikola Jokić",
      team: "Denver Nuggets",
      sport: "basketball",
      imageUrl:
        "https://ui-avatars.com/api/?background=111827&color=fff&name=Nikola+Jokic",
    },
    {
      name: "Luka Dončić",
      team: "Dallas Mavericks",
      sport: "basketball",
      imageUrl:
        "https://ui-avatars.com/api/?background=111827&color=fff&name=Luka+Doncic",
    },
    {
      name: "Jayson Tatum",
      team: "Boston Celtics",
      sport: "basketball",
      imageUrl:
        "https://ui-avatars.com/api/?background=111827&color=fff&name=Jayson+Tatum",
    },
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
      avatarSeed: p.avatarSeed || p.name || "default",
      isHost: p.isHost,
      joinedAt: p.joinedAt,
    })),
    lastGame: room.lastGame || null,
  };
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

// TheSportsDB API helper functions
const THESPORTSDB_API_KEY = "123"; // Free API key
const THESPORTSDB_BASE = "https://www.thesportsdb.com/api/v1/json";

async function searchTeamsFromTheSportsDB(teamName) {
  try {
    const url = `${THESPORTSDB_BASE}/${THESPORTSDB_API_KEY}/searchteams.php?t=${encodeURIComponent(teamName)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return data.teams || [];
    }
  } catch (e) {
    // Silently fail
  }
  return [];
}

async function searchPlayersFromTheSportsDB(playerName) {
  try {
    const url = `${THESPORTSDB_BASE}/${THESPORTSDB_API_KEY}/searchplayers.php?p=${encodeURIComponent(playerName)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return data.player || [];
    }
  } catch (e) {
    // Silently fail
  }
  return [];
}

async function fetchFootballPlayersFromTheSportsDB() {
  const players = [];
  // Buscar jugadores famosos de fútbol directamente por nombre
  // Esto es más eficiente que buscar equipos primero
  const famousNames = [
    "Lionel Messi",
    "Cristiano Ronaldo",
    "Kylian Mbappé",
    "Erling Haaland",
    "Karim Benzema",
    "Neymar",
    "Kevin De Bruyne",
    "Mohamed Salah",
  ];

  // Limitar a 4-5 jugadores para no exceder rate limits (30 req/min gratis)
  for (const name of famousNames.slice(0, 5)) {
    try {
      const playerResults = await searchPlayersFromTheSportsDB(name);
      if (playerResults && Array.isArray(playerResults) && playerResults.length > 0) {
        const p = playerResults[0];
        // TheSportsDB devuelve strThumb (foto) o strCutout (recorte)
        const imageUrl = p.strThumb
          ? `${p.strThumb}/preview`
          : p.strCutout
          ? `${p.strCutout}/preview`
          : null;

        players.push({
          name: p.strPlayer || name,
          team: p.strTeam || "Unknown",
          sport: "football",
          imageUrl,
        });
      }
      // Pequeña pausa para evitar rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (e) {
      // Continue with next player
    }
  }
  return players;
}

async function fetchBasketballPlayersFromTheSportsDB() {
  const players = [];
  // Buscar jugadores famosos de NBA directamente por nombre
  const famousNames = [
    "LeBron James",
    "Stephen Curry",
    "Kevin Durant",
    "Giannis Antetokounmpo",
    "Luka Doncic",
    "Jayson Tatum",
    "Nikola Jokic",
  ];

  // Limitar a 4-5 jugadores para no exceder rate limits
  for (const name of famousNames.slice(0, 5)) {
    try {
      const playerResults = await searchPlayersFromTheSportsDB(name);
      if (playerResults && Array.isArray(playerResults) && playerResults.length > 0) {
        const p = playerResults[0];
        const imageUrl = p.strThumb
          ? `${p.strThumb}/preview`
          : p.strCutout
          ? `${p.strCutout}/preview`
          : null;

        players.push({
          name: p.strPlayer || name,
          team: p.strTeam || "Unknown",
          sport: "basketball",
          imageUrl,
        });
      }
      // Pequeña pausa para evitar rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (e) {
      // Continue
    }
  }
  return players;
}

// Cargar cartas personalizadas desde JSON
function loadCustomCardsFromJSON() {
  try {
    // Intentar diferentes rutas posibles
    const possiblePaths = [
      path.join(__dirname, "../data/customCards.json"),
      path.join(__dirname, "../../data/customCards.json"),
      path.join(process.cwd(), "data/customCards.json"),
      path.join(process.cwd(), "impostando/data/customCards.json"),
    ];
    
    for (const jsonPath of possiblePaths) {
      if (fs.existsSync(jsonPath)) {
        console.log(`Cargando customCards.json desde: ${jsonPath}`);
        const data = fs.readFileSync(jsonPath, "utf8");
        const cards = JSON.parse(data);
        console.log(`Cargadas ${cards.length} cartas personalizadas`);
        return cards;
      }
    }
    console.warn("No se encontró customCards.json en ninguna ruta esperada");
  } catch (error) {
    console.error("Error cargando customCards.json:", error);
  }
  return [];
}

async function buildDeckForRoom(room) {
  const settings = room.settings;
  const isSpecialRoom = room.code === "00000";

  let pool = [];

  // Si es la sala especial "00000", usar solo las cartas personalizadas del JSON
  if (isSpecialRoom) {
    const customCards = loadCustomCardsFromJSON();
    if (customCards.length > 0) {
      pool = customCards.map((card) => ({
        name: card.name,
        team: card.category || "Personalizado",
        sport: "custom",
        imageUrl: card.photo || null,
        funFact: card.funFact || "",
      }));
    } else {
      // Fallback si no hay JSON
      pool = SAMPLE_PLAYERS.football.concat(SAMPLE_PLAYERS.basketball);
    }
  } else {
    // Lógica normal para otras salas
    if (settings.sport === "football" || settings.sport === "all") {
      pool = pool.concat(SAMPLE_PLAYERS.football);
      // Intentar obtener jugadores reales desde TheSportsDB
      try {
        const apiPlayers = await fetchFootballPlayersFromTheSportsDB();
        if (apiPlayers.length > 0) {
          pool = pool.concat(apiPlayers);
        }
      } catch (e) {
        // Si falla, seguimos con datos locales
      }
    }
    if (settings.sport === "basketball" || settings.sport === "all") {
      pool = pool.concat(SAMPLE_PLAYERS.basketball);
      // Intentar obtener jugadores reales desde TheSportsDB
      try {
        const apiPlayers = await fetchBasketballPlayersFromTheSportsDB();
        if (apiPlayers.length > 0) {
          pool = pool.concat(apiPlayers);
        }
      } catch (e) {
        // Si falla, seguimos con datos locales
      }
    }

    if (settings.customCards && settings.customCards.length > 0) {
      const custom = settings.customCards.map((label) => ({
        name: label,
        team: "Custom",
        sport: settings.sport === "all" ? "custom" : settings.sport,
        imageUrl: null,
        funFact: "",
      }));
      pool = pool.concat(custom);
    }
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

  // Lógica de juego tipo "impostor":
  // - Todas las personas de tripulación ven la MISMA carta de jugador real.
  // - Todos los impostores ven una carta especial que dice claramente "IMPOSTOR".

  const deck = {};

  // Elegimos una carta base para la tripulación
  const crewBase = pool[getRandomInt(pool.length)];

  // Carta fija para impostor: deja claro el rol, sin confundir con otro jugador
  const impostorBase = {
    name: "IMPOSTOR",
    team: "Tu carta es distinta. Engaña al resto sin que lo noten.",
    sport: crewBase.sport,
    imageUrl: null,
    funFact: null,
  };

  playersArray.forEach((player, index) => {
    const isImpostor = impostorIndexes.has(index);
    const base = isImpostor ? impostorBase : crewBase;
    // Generar un ID único que incluya timestamp para forzar el reset en el cliente
    deck[player.id] = {
      id: `${room.code}-${player.id}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      playerName: base.name,
      team: base.team,
      sport: base.sport,
      isImpostor,
      imageUrl: base.imageUrl || null,
      funFact: base.funFact || null,
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
  const avatarSeed = socket.handshake.query.avatarSeed || playerName || "default";

  const player = {
    id: socket.id,
    name: playerName,
    avatarSeed: avatarSeed,
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

  socket.on("update_avatar", (avatarSeed) => {
    const currentPlayer = room.players.get(socket.id);
    if (currentPlayer && avatarSeed && typeof avatarSeed === "string") {
      currentPlayer.avatarSeed = avatarSeed;
      console.log(`Avatar actualizado para ${currentPlayer.name}: ${avatarSeed}`);
      namespace.emit("room_state", publicRoomState(room));
    } else {
      console.log(`Error actualizando avatar: player=${!!currentPlayer}, seed=${avatarSeed}, type=${typeof avatarSeed}`);
    }
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

    // REINICIAR PARTIDA: Termina la partida actual (si existe) y empieza una nueva
    // Esto resetea todo: fase, tiempo de inicio, y genera nuevas cartas
    room.phase = "in-game";
    room.lastGame = { startedAt: Date.now() };

    const deck = await buildDeckForRoom(room);

    // Primero actualizar el estado de la sala
    namespace.emit("room_state", publicRoomState(room));

    // Luego enviar las nuevas cartas (esto reseteará las cartas en el cliente)
    Object.entries(deck).forEach(([socketId, card]) => {
      const target = namespace.sockets.get(socketId);
      if (target) {
        target.emit("your_card", card);
      }
    });
  });

  socket.on("reshuffle_cards", async () => {
    if (socket.id !== room.hostId) return;
    if (room.phase !== "in-game") {
      socket.emit("error_message", "Solo se puede barajar durante una partida en curso.");
      return;
    }
    
    // BARAJAR CARTAS: Redistribuye las cartas SIN terminar la partida
    // - NO cambia la fase (sigue "in-game")
    // - NO resetea el tiempo de inicio
    // - Solo genera nuevas cartas (puede cambiar quién es impostor)
    // - La partida sigue activa, solo cambian las cartas
    const deck = await buildDeckForRoom(room);
    
    // Enviar las nuevas cartas (esto reseteará las cartas en el cliente)
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
    if (socket.id !== room.hostId) {
      console.log(`Intento de expulsar por no-host: ${socket.id}`);
      return;
    }
    if (!targetId || typeof targetId !== "string") {
      console.log(`ID de jugador inválido: ${targetId}`);
      return;
    }
    if (!room.players.has(targetId)) {
      console.log(`Jugador no encontrado en la sala: ${targetId}`);
      return;
    }
    const targetPlayer = room.players.get(targetId);
    const targetSocket = namespace.sockets.get(targetId);
    if (targetSocket) {
      console.log(`Expulsando jugador: ${targetPlayer?.name} (${targetId})`);
      targetSocket.emit("kicked");
      targetSocket.disconnect(true);
      // Remover del mapa de jugadores
      room.players.delete(targetId);
      // Actualizar estado de la sala
      namespace.emit("room_state", publicRoomState(room));
    } else {
      console.log(`Socket no encontrado para expulsar: ${targetId}`);
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


