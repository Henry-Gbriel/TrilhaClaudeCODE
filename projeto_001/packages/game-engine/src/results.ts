import { CATEGORIES, type Category } from '@devquiz/shared';
import { rankPlayers, type RankedPlayer } from './ranking.js';
import { rankTeams, type TeamStanding } from './teams.js';
import type { PlayerStats } from './types.js';

export type Badge =
  | { kind: 'fastest'; playerId: string; avgCorrectTimeMs: number }
  | { kind: 'longest_streak'; playerId: string; streak: number }
  | { kind: 'specialist'; category: Category; playerId: string; correct: number };

/**
 * Escolhe o vencedor de um badge. Só concorre quem tem métrica (`value` não nulo);
 * empate na métrica vai para quem está melhor no ranking final.
 */
function pickBest(
  ranking: readonly RankedPlayer[],
  value: (p: PlayerStats) => number | null,
  better: (a: number, b: number) => boolean,
): { player: PlayerStats; value: number } | null {
  let best: { player: PlayerStats; value: number } | null = null;
  for (const { player } of ranking) {
    const v = value(player);
    if (v !== null && (best === null || better(v, best.value))) best = { player, value: v };
  }
  return best;
}

/** Badges de fim de partida (seção 7): "Mais rápido", "Maior streak" e "Especialista" por categoria. */
export function computeBadges(ranking: readonly RankedPlayer[]): Badge[] {
  const badges: Badge[] = [];

  const fastest = pickBest(
    ranking,
    (p) => (p.correctCount > 0 ? p.correctAnswerTimeMs / p.correctCount : null),
    (a, b) => a < b,
  );
  if (fastest) {
    badges.push({ kind: 'fastest', playerId: fastest.player.id, avgCorrectTimeMs: fastest.value });
  }

  const streak = pickBest(
    ranking,
    (p) => (p.maxStreak > 0 ? p.maxStreak : null),
    (a, b) => a > b,
  );
  if (streak) {
    badges.push({ kind: 'longest_streak', playerId: streak.player.id, streak: streak.value });
  }

  for (const category of CATEGORIES) {
    const specialist = pickBest(
      ranking,
      (p) => (p.byCategory[category].correct > 0 ? p.byCategory[category].correct : null),
      (a, b) => a > b,
    );
    if (specialist) {
      badges.push({
        kind: 'specialist',
        category,
        playerId: specialist.player.id,
        correct: specialist.value,
      });
    }
  }

  return badges;
}

export interface MatchResult {
  ranking: RankedPlayer[];
  podium: RankedPlayer[];
  teams: TeamStanding[];
  badges: Badge[];
}

/** Resultado final: ranking completo, pódio (top 3), times e badges. */
export function buildMatchResult(
  players: readonly PlayerStats[],
  teams: readonly string[] = [],
): MatchResult {
  const ranking = rankPlayers(players);
  return {
    ranking,
    podium: ranking.slice(0, 3),
    teams: teams.length > 0 ? rankTeams(players, teams) : [],
    badges: computeBadges(ranking),
  };
}
