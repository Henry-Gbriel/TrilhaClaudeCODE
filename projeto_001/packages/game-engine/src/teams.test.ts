import { describe, expect, it } from 'vitest';
import { createPlayer } from './player.js';
import { assignTeamsBalanced, rankTeams, smallestTeam, teamIds } from './teams.js';
import type { PlayerStats } from './types.js';

function member(id: string, team: string, score: number, correctCount = 0): PlayerStats {
  return { ...createPlayer(id, id, team), score, correctCount };
}

describe('teamIds', () => {
  it('gera de 2 a 4 times', () => {
    expect(teamIds(2)).toEqual(['A', 'B']);
    expect(teamIds(4)).toEqual(['A', 'B', 'C', 'D']);
  });

  it.each([1, 5, 2.5])('rejeita %d times', (count) => {
    expect(() => teamIds(count)).toThrow(RangeError);
  });
});

describe('assignTeamsBalanced', () => {
  it('distribui em round-robin, com diferença máxima de 1 jogador', () => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
    const assignment = assignTeamsBalanced(ids, ['A', 'B', 'C']);
    expect(assignment).toMatchObject({ p1: 'A', p2: 'B', p3: 'C', p4: 'A', p7: 'A' });
    const sizes = ['A', 'B', 'C'].map(
      (t) => Object.values(assignment).filter((v) => v === t).length,
    );
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
  });
});

describe('smallestTeam', () => {
  it('escolhe o time com menos jogadores; empate fica com o primeiro', () => {
    expect(smallestTeam([], ['A', 'B'])).toBe('A');
    expect(smallestTeam([{ team: 'A' }, { team: 'A' }, { team: 'B' }], ['A', 'B', 'C'])).toBe('C');
    expect(smallestTeam([{ team: 'A' }], ['A', 'B'])).toBe('B');
  });
});

describe('rankTeams', () => {
  it('usa a média dos membros, então o tamanho do time não decide', () => {
    const players = [
      member('a1', 'A', 900),
      member('b1', 'B', 1000),
      member('b2', 'B', 600),
      member('b3', 'B', 500),
    ];
    const standings = rankTeams(players, ['A', 'B']);
    expect(standings.map((s) => [s.team, s.rank, s.score, s.memberCount])).toEqual([
      ['A', 1, 900, 1],
      ['B', 2, 700, 3],
    ]);
  });

  it('aponta o melhor jogador de cada time', () => {
    const standings = rankTeams(
      [member('a1', 'A', 100), member('a2', 'A', 800), member('b1', 'B', 300)],
      ['A', 'B'],
    );
    expect(standings.map((s) => [s.team, s.bestPlayer.player.id])).toEqual([
      ['A', 'a2'],
      ['B', 'b1'],
    ]);
  });

  it('ignora times sem membros', () => {
    expect(rankTeams([member('a1', 'A', 100)], ['A', 'B', 'C']).map((s) => s.team)).toEqual(['A']);
  });

  it('desempata por média de acertos e divide a posição em empate total', () => {
    const standings = rankTeams(
      [
        member('a1', 'A', 500, 1),
        member('b1', 'B', 500, 2),
        member('c1', 'C', 500, 1),
        member('d1', 'D', 500, 1),
      ],
      ['A', 'B', 'C', 'D'],
    );
    expect(standings.map((s) => [s.team, s.rank])).toEqual([
      ['B', 1],
      ['A', 2],
      ['C', 2],
      ['D', 2],
    ]);
  });
});
