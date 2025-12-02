"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type SportType = "football" | "basketball" | "all";

function generateRoomCode() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto
      .randomUUID()
      .replace(/-/g, "")
      .slice(0, 5)
      .toUpperCase();
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
  const [sport, setSport] = useState<SportType>("all");
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [impostors, setImpostors] = useState(2);
  const [popularTeams, setPopularTeams] = useState(true);
  const [famousPlayers, setFamousPlayers] = useState(true);
  const [customCardInput, setCustomCardInput] = useState("");

  const customCards = useMemo(
    () =>
      customCardInput
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    [customCardInput],
  );

  const handleCreateRoom = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = playerName.trim() || "Host";
    const code = generateRoomCode();
    const params = new URLSearchParams({
      name: trimmedName,
      host: "1",
      sport,
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
    const trimmedName = playerName.trim() || "Jugador";
    const code = joinCode.trim().toUpperCase();
    if (!code || code.length !== 5) return;
    const params = new URLSearchParams({
      name: trimmedName,
      host: "0",
    });
    router.push(`/room/${code}?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-4 py-10 md:flex-row md:items-center md:justify-between">
        <section className="space-y-6 md:w-1/2">
          <div className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/70 px-4 py-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-300">
            Impostando · Juego de roles deportivos
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            Encuentra al impostor
            <span className="block bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">
              entre tus estrellas favoritas
            </span>
          </h1>
          <p className="max-w-xl text-base text-slate-300 sm:text-lg">
            Crea una sala, reparte cartas de jugadores de fútbol o básquet y
            descubre quién está fingiendo. Roles ocultos, estadísticas
            divertidas y salas rápidas para tus amigos.
          </p>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>· Códigos de sala cortos (5 letras)</li>
            <li>· Reparto de impostores configurable</li>
            <li>· Cartas personalizadas para modos caóticos</li>
            <li>· Mini chat y moderación de sala</li>
          </ul>
        </section>

        <section className="flex w-full flex-col gap-6 md:w-[380px]">
          <form
            onSubmit={handleCreateRoom}
            className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-emerald-500/10 backdrop-blur"
          >
            <h2 className="text-lg font-semibold text-slate-50">
              Crear sala nueva
            </h2>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Tu nombre
              </label>
              <input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={24}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-emerald-500/60 transition focus:border-emerald-400 focus:ring-2"
                placeholder="Ej: Leo, Gabi, Sofi..."
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSport("football")}
                className={`rounded-xl border px-2 py-1.5 transition ${
                  sport === "football"
                    ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                    : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500"
                }`}
              >
                Fútbol
              </button>
              <button
                type="button"
                onClick={() => setSport("basketball")}
                className={`rounded-xl border px-2 py-1.5 transition ${
                  sport === "basketball"
                    ? "border-orange-400 bg-orange-500/10 text-orange-200"
                    : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500"
                }`}
              >
                Básquet
              </button>
              <button
                type="button"
                onClick={() => setSport("all")}
                className={`rounded-xl border px-2 py-1.5 transition ${
                  sport === "all"
                    ? "border-violet-400 bg-violet-500/10 text-violet-200"
                    : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500"
                }`}
              >
                Todos
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Máx. jugadores
                </label>
                <input
                  type="number"
                  min={3}
                  max={20}
                  value={maxPlayers}
                  onChange={(e) =>
                    setMaxPlayers(
                      Math.min(20, Math.max(3, Number(e.target.value) || 3)),
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs outline-none ring-emerald-500/60 transition focus:border-emerald-400 focus:ring-2"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Nº de impostores
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={impostors}
                  onChange={(e) =>
                    setImpostors(
                      Math.min(5, Math.max(1, Number(e.target.value) || 1)),
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs outline-none ring-emerald-500/60 transition focus:border-emerald-400 focus:ring-2"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 text-xs">
              <label className="font-medium text-slate-300">Filtros</label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={popularTeams}
                  onChange={(e) => setPopularTeams(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 text-emerald-400 focus:ring-emerald-500"
                />
                <span className="text-slate-300">Equipos populares</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={famousPlayers}
                  onChange={(e) => setFamousPlayers(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 text-emerald-400 focus:ring-emerald-500"
                />
                <span className="text-slate-300">Jugadores famosos</span>
              </label>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-slate-300">
                  Cartas personalizadas
                </label>
                <span className="text-[10px] text-slate-400">
                  Una por línea (memes, amigos, etc.)
                </span>
              </div>
              <textarea
                value={customCardInput}
                onChange={(e) => setCustomCardInput(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs outline-none ring-emerald-500/60 transition focus:border-emerald-400 focus:ring-2"
                placeholder={"Ej:\nKun Agüero en Twitch\nMi profe de mates\nMessi en la Play"}
              />
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:brightness-110"
            >
              Iniciar sala como host
            </button>
          </form>

          <form
            onSubmit={handleJoinRoom}
            className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-200"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">¿Ya tienes un código?</span>
              <span className="text-[10px] text-slate-400">
                Compártelo o pega un link para entrar
              </span>
            </div>
            <div className="flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={5}
                className="w-24 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-center text-sm tracking-[0.35em] outline-none ring-cyan-500/60 transition focus:border-cyan-400 focus:ring-2"
                placeholder="ABCDE"
              />
              <button
                type="submit"
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-medium text-slate-100 transition hover:border-cyan-400 hover:bg-cyan-500/10"
              >
                Entrar a sala
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

