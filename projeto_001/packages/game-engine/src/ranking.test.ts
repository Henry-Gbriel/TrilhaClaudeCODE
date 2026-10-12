import { describe, expect, it } from 'vitest';
import { applyOutcome, averageAnswerTimeMs, createPlayer } from './player.js';
import { rankPlayers } from './ranking.js';
import { scoreAnswer } from './scoring.js';
import { question } from './test-fixtures.js';
import type { PlayerStats } from './types.js';

function player(
  id: string,
  stats: Partial<
    Pick<PlayerStats, 'score' | 'correctCount' | 'answeredCount' | 'totalAnswerTimeMs'>
  >,
): PlayerStats {
  return { ...createPlayer(id, id), ...stats };
}

describe('createPlayer / applyOutcome', () => {
  it('acumula pontos, acertos, tempos, streak e categoria', () => {
    const q = question('q', { category: 'WORKFLOW' });
    let p = createPlayer('p1', 'Ana', 'A');
    for (const timeMs of [2_000, 4_000]) {
      const outcome = scoreAnswer({
        question: q,
        choice: ['b'],
        timeMs,
        timeLimitMs: 20_000,
        previousStreak: p.streak,
        useDifficultyMultiplier: false,
      });
      p = applyOutcome(p, q, outcome);
    }
    const miss = scoreAnswer({
      question: q,
      choice: null,
      timeMs: null,
      timeLimitMs: 20_000,
      previousStreak: p.streak,
      useDifficultyMultiplier: false,
    });
    p = applyOutcome(p, q, miss);

    expect(p).toMatchObject({
      team: 'A',
      score: 950 + 900,
      correctCount: 2,
      answeredCount: 2,
      streak: 0,
      maxStreak: 2,
      totalAnswerTimeMs: 6_000,
      correctAnswerTimeMs: 6_000,
    });
    expect(p.byCategory.WORKFLOW).toEqual({ correct: 2, total: 3 });
    expect(p.byCategory.IA).toEqual({ correct: 0, total: 0 });
    expect(averageAnswerTimeMs(p)).toBe(3_000);
  });

  it('tempo médio é null para quem não respondeu nada', () => {
    expect(averageAnswerTimeMs(createPlayer('p', 'p'))).toBeNull();
  });
});

describe('rankPlayers', () => {
  it('ordena por pontos', () => {
    const ranking = rankPlayers([player('a', { score: 100 }), player('b', { score: 300 })]);
    expect(ranking.map((r) => [r.player.id, r.rank])).toEqual([
      ['b', 1],
      ['a', 2],
    ]);
  });

  it('desempata por mais acertos', () => {
    const ranking = rankPlayers([
      player('a', { score: 500, correctCount: 1 }),
      player('b', { score: 500, correctCount: 2 }),
    ]);
    expect(ranking.map((r) => r.player.id)).toEqual(['b', 'a']);
  });

  it('persistindo o empate, desempata pelo menor tempo médio', () => {
    const ranking = rankPlayers([
      player('lento', { score: 500, correctCount: 1, answeredCount: 2, totalAnswerTimeMs: 20_000 }),
      player('rapido', { score: 500, correctCount: 1, answeredCount: 2, totalAnswerTimeMs: 8_000 }),
    ]);
    expect(ranking.map((r) => [r.player.id, r.rank, r.avgTimeMs])).toEqual([
      ['rapido', 1, 4_000],
      ['lento', 2, 10_000],
    ]);
  });

  it('quem não respondeu nada fica atrás no tempo', () => {
    const ranking = rankPlayers([
      player('ausente', {}),
      player('presente', { answeredCount: 1, totalAnswerTimeMs: 19_000 }),
    ]);
    expect(ranking.map((r) => r.player.id)).toEqual(['presente', 'ausente']);
  });

  it('empate total divide a posição (1, 1, 3) e mantém a ordem de entrada', () => {
    const tie = { score: 700, correctCount: 1, answeredCount: 1, totalAnswerTimeMs: 5_000 };
    const ranking = rankPlayers([player('x', tie), player('y', tie), player('z', { score: 10 })]);
    expect(ranking.map((r) => [r.player.id, r.rank])).toEqual([
      ['x', 1],
      ['y', 1],
      ['z', 3],
    ]);
  });

  it('lista vazia gera ranking vazio', () => {
    expect(rankPlayers([])).toEqual([]);
  });
});
