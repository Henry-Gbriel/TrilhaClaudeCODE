import { averageAnswerTimeMs } from './player.js';
import type { PlayerStats } from './types.js';

export interface RankedPlayer {
  rank: number;
  player: PlayerStats;
  avgTimeMs: number | null;
}

/**
 * Compara dois jogadores pela regra do PRD: mais pontos, depois mais acertos,
 * depois menor tempo médio. Quem não respondeu nada fica atrás no tempo.
 */
function compare(a: RankedPlayer, b: RankedPlayer): number {
  if (a.player.score !== b.player.score) return b.player.score - a.player.score;
  if (a.player.correctCount !== b.player.correctCount) {
    return b.player.correctCount - a.player.correctCount;
  }
  return (a.avgTimeMs ?? Infinity) - (b.avgTimeMs ?? Infinity);
}

/**
 * Ranking com desempate. Empate total divide a posição ("1, 1, 3"); a ordem de
 * entrada na sala só decide a ordem de exibição entre empatados.
 */
export function rankPlayers(players: readonly PlayerStats[]): RankedPlayer[] {
  const sorted = players
    .map((player) => ({ rank: 0, player, avgTimeMs: averageAnswerTimeMs(player) }))
    .sort(compare);

  let previous: RankedPlayer | undefined;
  return sorted.map((entry, index) => {
    const rank = previous && compare(previous, entry) === 0 ? previous.rank : index + 1;
    const ranked = { ...entry, rank };
    previous = ranked;
    return ranked;
  });
}
