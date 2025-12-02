"use client";

import { useEffect, useState } from "react";
import type { GameCard, RoomState } from "./useRoomSocket";

type GameHistoryEntry = {
  at: number;
  roomCode: string;
  impostor: boolean;
  sport: GameCard["sport"];
  team: string;
};

type StoredStats = {
  gamesPlayed: number;
  impostorCount: number;
  wins: number;
  sports: Record<string, number>;
  teams: Record<string, number>;
  history: GameHistoryEntry[];
};

const STORAGE_KEY_PREFIX = "impostando-stats-v1-";

function readStats(playerName: string): StoredStats {
  if (typeof window === "undefined") {
    return {
      gamesPlayed: 0,
      impostorCount: 0,
      wins: 0,
      sports: {},
      teams: {},
      history: [],
    };
  }
  const key = STORAGE_KEY_PREFIX + playerName;
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return {
      gamesPlayed: 0,
      impostorCount: 0,
      wins: 0,
      sports: {},
      teams: {},
      history: [],
    };
  }
  try {
    const parsed = JSON.parse(raw) as StoredStats;
    return {
      gamesPlayed: parsed.gamesPlayed ?? 0,
      impostorCount: parsed.impostorCount ?? 0,
      wins: parsed.wins ?? 0,
      sports: parsed.sports ?? {},
      teams: parsed.teams ?? {},
      history: parsed.history ?? [],
    };
  } catch {
    return {
      gamesPlayed: 0,
      impostorCount: 0,
      wins: 0,
      sports: {},
      teams: {},
      history: [],
    };
  }
}

function writeStats(playerName: string, stats: StoredStats) {
  if (typeof window === "undefined") return;
  const key = STORAGE_KEY_PREFIX + playerName;
  window.localStorage.setItem(key, JSON.stringify(stats));
}

export function usePlayerStats(playerName: string) {
  const [stats, setStats] = useState<StoredStats>(() =>
    readStats(playerName),
  );

  useEffect(() => {
    setStats(readStats(playerName));
  }, [playerName]);

  const persist = (next: StoredStats) => {
    setStats(next);
    writeStats(playerName, next);
  };

  const registerGameStart = (card: GameCard) => {
    const next: StoredStats = {
      ...stats,
      gamesPlayed: stats.gamesPlayed + 1,
      impostorCount: stats.impostorCount + (card.isImpostor ? 1 : 0),
      sports: {
        ...stats.sports,
        [card.sport]: (stats.sports[card.sport] ?? 0) + 1,
      },
      teams: {
        ...stats.teams,
        [card.team]: (stats.teams[card.team] ?? 0) + 1,
      },
      history: [
        ...stats.history,
        {
          at: Date.now(),
          roomCode: "unknown",
          impostor: card.isImpostor,
          sport: card.sport,
          team: card.team,
        },
      ].slice(-50),
    };
    persist(next);
  };

  const registerGameEnd = (
    summary: NonNullable<RoomState["lastGame"]>,
  ) => {
    if (!summary.winner) return;
    const next: StoredStats = { ...stats };
    if (summary.winner === "crew") {
      next.wins += 1;
    }
    persist(next);
  };

  const mostPlayedSport =
    Object.entries(stats.sports).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    null;

  return {
    stats: {
      ...stats,
      mostPlayedSport,
    },
    registerGameStart,
    registerGameEnd,
  };
}


