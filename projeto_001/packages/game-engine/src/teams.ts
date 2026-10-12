import { rankPlayers, type RankedPlayer } from './ranking.js';
import type { PlayerStats } from './types.js';

const TEAM_IDS = ['A', 'B', 'C', 'D'] as const;

/** Ids dos times de uma sala com `count` times (2 a 4): A, B, C, D. */
export function teamIds(count: number): string[] {
  if (!Number.isInteger(count) || count < 2 || count > TEAM_IDS.length) {
    throw new RangeError(
      `Número de times deve ser de 2 a ${String(TEAM_IDS.length)}, veio ${String(count)}`,
    );
  }
  return TEAM_IDS.slice(0, count);
}

/**
 * Distribuição automática e balanceada: round-robin na ordem recebida, então os
 * tamanhos diferem em no máximo 1. Para sortear, embaralhe `playerIds` antes.
 */
export function assignTeamsBalanced(
  playerIds: readonly string[],
  teams: readonly string[],
): Record<string, string> {
  return Object.fromEntries(
    playerIds.map((id, index) => [id, teams[index % teams.length] as string]),
  );
}

/** Time com menos jogadores (empate: o primeiro na ordem), para quem entra sem escolher. */
export function smallestTeam(
  players: readonly Pick<PlayerStats, 'team'>[],
  teams: readonly string[],
): string {
  const sizes = teams.map((team) => players.filter((p) => p.team === team).length);
  const min = Math.min(...sizes);
  return teams[sizes.indexOf(min)] as string;
}

export interface TeamStanding {
  rank: number;
  team: string;
  /** Média dos pontos dos membros, para o tamanho do time não decidir o resultado. */
  score: number;
  memberCount: number;
  bestPlayer: RankedPlayer;
}

/** Ranking de times. Times sem membros ficam de fora. Desempate: mais acertos em média. */
export function rankTeams(
  players: readonly PlayerStats[],
  teams: readonly string[],
): TeamStanding[] {
  const ranking = rankPlayers(players);
  const standings = teams.flatMap((team) => {
    const members = ranking.filter((entry) => entry.player.team === team);
    const [bestPlayer] = members;
    if (!bestPlayer) return [];
    const total = members.reduce((sum, m) => sum + m.player.score, 0);
    const correct = members.reduce((sum, m) => sum + m.player.correctCount, 0);
    return [
      {
        team,
        score: Math.round(total / members.length),
        avgCorrect: correct / members.length,
        memberCount: members.length,
        bestPlayer,
      },
    ];
  });

  standings.sort((a, b) => b.score - a.score || b.avgCorrect - a.avgCorrect);

  let previousRank = 0;
  return standings.map(({ avgCorrect, ...standing }, index, all) => {
    const prev = all[index - 1];
    const tied = prev?.score === standing.score && prev.avgCorrect === avgCorrect;
    previousRank = tied ? previousRank : index + 1;
    return { ...standing, rank: previousRank };
  });
}
