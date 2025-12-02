export type Sport = "football" | "basketball" | "all";

export type PlayerCard = {
  name: string;
  team: string;
  sport: Sport | "custom";
};

export type PlayerFilters = {
  sport: Sport;
  team?: string;
  onlyFamous?: boolean;
};

const LOCAL_FOOTBALL: PlayerCard[] = [
  { name: "Lionel Messi", team: "Inter Miami", sport: "football" },
  { name: "Kylian Mbappé", team: "Real Madrid", sport: "football" },
  { name: "Erling Haaland", team: "Manchester City", sport: "football" },
  { name: "Vinícius Jr.", team: "Real Madrid", sport: "football" },
  { name: "Kevin De Bruyne", team: "Manchester City", sport: "football" },
];

const LOCAL_BASKETBALL: PlayerCard[] = [
  { name: "LeBron James", team: "Los Angeles Lakers", sport: "basketball" },
  { name: "Stephen Curry", team: "Golden State Warriors", sport: "basketball" },
  { name: "Nikola Jokić", team: "Denver Nuggets", sport: "basketball" },
  { name: "Luka Dončić", team: "Dallas Mavericks", sport: "basketball" },
  { name: "Giannis Antetokounmpo", team: "Milwaukee Bucks", sport: "basketball" },
];

export async function fetchFromBasketballApi(
  perPage = 40,
): Promise<PlayerCard[]> {
  try {
    const res = await fetch(
      `https://api.balldontlie.io/v1/players?per_page=${perPage}&page=1`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data ?? []).map((p: any) => ({
      name: `${p.first_name} ${p.last_name}`,
      team: p.team?.full_name || "Unknown",
      sport: "basketball" as const,
    }));
  } catch {
    return [];
  }
}

export async function getPlayers(
  filters: PlayerFilters,
): Promise<PlayerCard[]> {
  const output: PlayerCard[] = [];

  if (filters.sport === "football" || filters.sport === "all") {
    output.push(...LOCAL_FOOTBALL);
  }
  if (filters.sport === "basketball" || filters.sport === "all") {
    output.push(...LOCAL_BASKETBALL);
    const apiPlayers = await fetchFromBasketballApi();
    output.push(...apiPlayers);
  }

  let result = output;

  if (filters.team) {
    result = result.filter(
      (p) => p.team.toLowerCase().includes(filters.team!.toLowerCase()),
    );
  }

  if (filters.onlyFamous) {
    const famousKeywords = ["Messi", "LeBron", "Curry", "Haaland", "Giannis"];
    result = result.filter((p) =>
      famousKeywords.some((k) => p.name.includes(k)),
    );
  }

  return result;
}

export function buildRandomRoleList(
  players: PlayerCard[],
  totalPlayers: number,
  impostors: number,
): PlayerCard[] {
  if (players.length === 0 || totalPlayers <= 0) return [];
  const pool = [...players];
  const chosen: PlayerCard[] = [];
  for (let i = 0; i < totalPlayers; i += 1) {
    const index = Math.floor(Math.random() * pool.length);
    chosen.push(pool[index]);
  }
  // La información de quién es impostor se maneja aparte en el servidor;
  // este módulo solo devuelve la lista de cartas base.
  return chosen;
}


