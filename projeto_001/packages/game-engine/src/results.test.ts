import { describe, expect, it } from 'vitest';
import { createPlayer } from './player.js';
import { rankPlayers } from './ranking.js';
import { buildMatchResult, computeBadges } from './results.js';
import type { PlayerStats } from './types.js';

function player(id: string, patch: Partial<PlayerStats> = {}): PlayerStats {
  return { ...createPlayer(id, id), ...patch };
}

function withCategory(
  p: PlayerStats,
  category: 'IA' | 'WORKFLOW' | 'PROGRAMACAO',
  correct: number,
) {
  return { ...p, byCategory: { ...p.byCategory, [category]: { correct, total: correct } } };
}

describe('computeBadges', () => {
  it('"Mais rápido" considera só o tempo das respostas corretas', () => {
    const badges = computeBadges(
      rankPlayers([
        // Responde rápido, mas errando: não concorre pelo tempo dos erros.
        player('chutador', {
          correctCount: 1,
          correctAnswerTimeMs: 9_000,
          totalAnswerTimeMs: 10_000,
        }),
        player('preciso', { correctCount: 2, correctAnswerTimeMs: 8_000 }),
      ]),
    );
    expect(badges).toContainEqual({
      kind: 'fastest',
      playerId: 'preciso',
      avgCorrectTimeMs: 4_000,
    });
  });

  it('"Maior streak" vai para o maior streak da partida', () => {
    const badges = computeBadges(
      rankPlayers([player('a', { maxStreak: 2 }), player('b', { maxStreak: 5 })]),
    );
    expect(badges).toContainEqual({ kind: 'longest_streak', playerId: 'b', streak: 5 });
  });

  it('"Especialista" sai por categoria, para quem mais acertou nela', () => {
    const badges = computeBadges(
      rankPlayers([
        withCategory(player('ia'), 'IA', 3),
        withCategory(withCategory(player('dev'), 'PROGRAMACAO', 4), 'IA', 1),
      ]),
    );
    expect(badges.filter((b) => b.kind === 'specialist')).toEqual([
      { kind: 'specialist', category: 'IA', playerId: 'ia', correct: 3 },
      { kind: 'specialist', category: 'PROGRAMACAO', playerId: 'dev', correct: 4 },
    ]);
  });

  it('empate na métrica vai para quem está melhor no ranking', () => {
    const badges = computeBadges(
      rankPlayers([
        player('segundo', { score: 100, maxStreak: 3 }),
        player('primeiro', { score: 900, maxStreak: 3 }),
      ]),
    );
    expect(badges).toContainEqual({ kind: 'longest_streak', playerId: 'primeiro', streak: 3 });
  });

  it('sem nenhum acerto, ninguém ganha badge', () => {
    expect(computeBadges(rankPlayers([player('a'), player('b')]))).toEqual([]);
  });
});

describe('buildMatchResult', () => {
  it('monta ranking, pódio com top 3, times e badges', () => {
    const players = ['p1', 'p2', 'p3', 'p4'].map((id, i) =>
      player(id, { score: (i + 1) * 100, team: i % 2 === 0 ? 'A' : 'B' }),
    );
    const result = buildMatchResult(players, ['A', 'B']);
    expect(result.ranking).toHaveLength(4);
    expect(result.podium.map((r) => r.player.id)).toEqual(['p4', 'p3', 'p2']);
    expect(result.teams.map((t) => [t.team, t.score])).toEqual([
      ['B', 300],
      ['A', 200],
    ]);
    expect(result.badges).toEqual([]);
  });

  it('sem times, a lista de times fica vazia', () => {
    expect(buildMatchResult([player('solo')]).teams).toEqual([]);
  });
});
