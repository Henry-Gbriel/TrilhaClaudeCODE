import type { LiveSettings } from '@devquiz/shared';
import { describe, expect, it } from 'vitest';
import {
  answerDistribution,
  createLiveMatch,
  currentQuestion,
  haveAllAnswered,
  liveReducer,
  liveResult,
  MAX_PLAYERS,
  type LiveEvent,
  type LiveState,
} from './live.js';
import { liveSettings, multiSelect, question } from './test-fixtures.js';
import type { EngineQuestion } from './types.js';

const T0 = 1_000_000;

/** Aplica eventos em sequência e falha o teste se algum for rejeitado. */
function run(state: LiveState, ...events: LiveEvent[]): LiveState {
  return events.reduce((s, event) => {
    const result = liveReducer(s, event);
    if (!result.ok) throw new Error(`${event.type} rejeitado: ${result.error}`);
    return result.state;
  }, state);
}

function errorOf(state: LiveState, event: LiveEvent): string | null {
  const result = liveReducer(state, event);
  return result.ok ? null : result.error;
}

function lobby(
  settings: Partial<LiveSettings> = {},
  questions: EngineQuestion[] = [question('q1'), question('q2')],
  playerIds = ['ana', 'bia'],
): LiveState {
  return run(
    createLiveMatch(liveSettings(settings), questions),
    ...playerIds.map((id): LiveEvent => ({ type: 'JOIN', playerId: id, nickname: id })),
  );
}

/** Lobby → primeira pergunta aberta em T0. */
function firstQuestion(settings: Partial<LiveSettings> = {}, questions?: EngineQuestion[]) {
  return run(
    lobby(settings, questions),
    { type: 'START', now: T0 },
    { type: 'COUNTDOWN_DONE', now: T0 },
  );
}

const answer = (playerId: string, choice: string[], now: number, questionId = 'q1'): LiveEvent => ({
  type: 'SUBMIT_ANSWER',
  playerId,
  questionId,
  choice,
  now,
});

describe('createLiveMatch', () => {
  it('começa no LOBBY, sem jogadores e sem pergunta atual', () => {
    const state = createLiveMatch(liveSettings({ teams: { count: 3, mode: 'auto' } }), [
      question('q1'),
    ]);
    expect(state).toMatchObject({
      phase: 'LOBBY',
      currentIndex: -1,
      players: [],
      teams: ['A', 'B', 'C'],
    });
    expect(currentQuestion(state)).toBeUndefined();
  });

  it('exige pelo menos uma pergunta', () => {
    expect(() => createLiveMatch(liveSettings(), [])).toThrow(RangeError);
  });
});

describe('partida completa', () => {
  it('percorre LOBBY → … → PODIUM → FINISHED e pontua no servidor', () => {
    let s = run(lobby(), { type: 'START', now: T0 });
    expect(s.phase).toBe('COUNTDOWN');

    s = run(s, { type: 'COUNTDOWN_DONE', now: T0 });
    expect(s).toMatchObject({ phase: 'QUESTION_OPEN', currentIndex: 0, deadline: T0 + 20_000 });

    // Ana acerta em 10 s (750); Bia erra.
    s = run(s, answer('ana', ['b'], T0 + 10_000), answer('bia', ['a'], T0 + 1_000));
    expect(haveAllAnswered(s)).toBe(true);
    expect(answerDistribution(s)).toEqual({ a: 1, b: 1, c: 0, d: 0 });

    s = run(s, { type: 'CLOSE_QUESTION' });
    expect(s.phase).toBe('QUESTION_CLOSED');
    expect(s.lastOutcomes.ana).toMatchObject({ correct: true, points: 750, timeMs: 10_000 });
    expect(s.lastOutcomes.bia).toMatchObject({ correct: false, points: 0 });

    s = run(s, { type: 'REVEAL' }, { type: 'SHOW_LEADERBOARD' });
    expect(s.phase).toBe('LEADERBOARD');

    // Segunda pergunta: só a Bia responde, em 0 s.
    s = run(s, { type: 'NEXT', now: T0 + 60_000 });
    expect(s).toMatchObject({ phase: 'QUESTION_OPEN', currentIndex: 1, answers: {} });
    s = run(
      s,
      answer('bia', ['b'], T0 + 60_000, 'q2'),
      { type: 'CLOSE_QUESTION' },
      { type: 'REVEAL' },
      { type: 'SHOW_LEADERBOARD' },
      { type: 'NEXT', now: T0 + 90_000 },
    );
    expect(s.phase).toBe('PODIUM');

    const result = liveResult(s);
    expect(result.ranking.map((r) => [r.player.id, r.player.score])).toEqual([
      ['bia', 1000],
      ['ana', 750],
    ]);
    expect(s.players.find((p) => p.id === 'ana')).toMatchObject({ streak: 0, maxStreak: 1 });

    expect(run(s, { type: 'FINISH' }).phase).toBe('FINISHED');
  });

  it('aplica o multiplicador de dificuldade quando o host liga a opção', () => {
    const s = run(
      firstQuestion({ difficultyMultiplier: true }, [question('q1', { difficulty: 'dificil' })]),
      answer('ana', ['b'], T0),
      { type: 'CLOSE_QUESTION' },
    );
    expect(s.lastOutcomes.ana?.points).toBe(1500);
  });

  it('pontua multi_select parcialmente', () => {
    const s = run(firstQuestion({}, [multiSelect('q1')]), answer('ana', ['a'], T0), {
      type: 'CLOSE_QUESTION',
    });
    expect(s.lastOutcomes.ana).toMatchObject({ fraction: 0.5, points: 500, correct: false });
  });
});

describe('entrada e saída de jogadores', () => {
  it('reconexão preserva a pontuação, mesmo no meio do jogo', () => {
    let s = run(firstQuestion(), answer('ana', ['b'], T0), { type: 'CLOSE_QUESTION' });
    s = run(s, { type: 'LEAVE', playerId: 'ana' });
    expect(s.connected.ana).toBe(false);
    s = run(s, { type: 'JOIN', playerId: 'ana', nickname: 'outro nome' });
    expect(s.connected.ana).toBe(true);
    expect(s.players.find((p) => p.id === 'ana')).toMatchObject({ nickname: 'ana', score: 1000 });
  });

  it('jogador novo não entra depois do início', () => {
    expect(errorOf(firstQuestion(), { type: 'JOIN', playerId: 'nova', nickname: 'n' })).toBe(
      'GAME_IN_PROGRESS',
    );
  });

  it(`sala lotada com ${String(MAX_PLAYERS)} jogadores`, () => {
    const ids = Array.from({ length: MAX_PLAYERS }, (_, i) => `p${String(i)}`);
    const full = lobby({}, undefined, ids);
    expect(errorOf(full, { type: 'JOIN', playerId: 'extra', nickname: 'x' })).toBe('ROOM_FULL');
  });

  it('ninguém entra em partida encerrada', () => {
    const done = run(lobby(), { type: 'END' });
    expect(done.phase).toBe('FINISHED');
    expect(errorOf(done, { type: 'JOIN', playerId: 'ana', nickname: 'ana' })).toBe('INVALID_PHASE');
    expect(errorOf(done, { type: 'KICK', playerId: 'ana' })).toBe('INVALID_PHASE');
  });

  it('host remove jogador, junto com a resposta dele', () => {
    let s = run(firstQuestion(), answer('bia', ['b'], T0));
    s = run(s, { type: 'KICK', playerId: 'bia' });
    expect(s.players.map((p) => p.id)).toEqual(['ana']);
    expect(s.answers).toEqual({});
    expect('bia' in s.connected).toBe(false);
  });

  it('LEAVE e KICK de jogador desconhecido falham', () => {
    expect(errorOf(lobby(), { type: 'LEAVE', playerId: 'x' })).toBe('PLAYER_NOT_FOUND');
    expect(errorOf(lobby(), { type: 'KICK', playerId: 'x' })).toBe('PLAYER_NOT_FOUND');
  });

  it('não inicia sem jogadores, nem duas vezes', () => {
    expect(errorOf(lobby({}, undefined, []), { type: 'START', now: T0 })).toBe('NO_PLAYERS');
    expect(errorOf(firstQuestion(), { type: 'START', now: T0 })).toBe('INVALID_PHASE');
  });
});

describe('modo times', () => {
  it('auto: distribui de forma balanceada ao iniciar', () => {
    const s = run(lobby({ teams: { count: 2, mode: 'auto' } }, undefined, ['p1', 'p2', 'p3']), {
      type: 'START',
      now: T0,
    });
    expect(s.players.map((p) => p.team)).toEqual(['A', 'B', 'A']);
  });

  it('auto: escolha manual não é permitida', () => {
    const s = lobby({ teams: { count: 2, mode: 'auto' } });
    expect(errorOf(s, { type: 'CHOOSE_TEAM', playerId: 'ana', team: 'B' })).toBe(
      'TEAM_CHOICE_DISABLED',
    );
  });

  it('choice: entra no time pedido ou no menor, e pode trocar no lobby', () => {
    const settings = { teams: { count: 2, mode: 'choice' } } as const;
    let s = createLiveMatch(liveSettings(settings), [question('q1')]);
    s = run(
      s,
      { type: 'JOIN', playerId: 'p1', nickname: 'p1', team: 'B' },
      { type: 'JOIN', playerId: 'p2', nickname: 'p2' },
    );
    expect(s.players.map((p) => p.team)).toEqual(['B', 'A']);

    s = run(s, { type: 'CHOOSE_TEAM', playerId: 'p2', team: 'B' });
    expect(s.players.map((p) => p.team)).toEqual(['B', 'B']);

    expect(errorOf(s, { type: 'JOIN', playerId: 'p3', nickname: 'p3', team: 'Z' })).toBe(
      'UNKNOWN_TEAM',
    );
    expect(errorOf(s, { type: 'CHOOSE_TEAM', playerId: 'p1', team: 'Z' })).toBe('UNKNOWN_TEAM');
    expect(errorOf(s, { type: 'CHOOSE_TEAM', playerId: 'x', team: 'A' })).toBe('PLAYER_NOT_FOUND');
    expect(
      errorOf(run(s, { type: 'START', now: T0 }), {
        type: 'CHOOSE_TEAM',
        playerId: 'p1',
        team: 'A',
      }),
    ).toBe('INVALID_PHASE');
  });

  it('sem modo times, escolher time falha e o ranking de times fica vazio', () => {
    expect(errorOf(lobby(), { type: 'CHOOSE_TEAM', playerId: 'ana', team: 'A' })).toBe(
      'TEAMS_DISABLED',
    );
    expect(liveResult(lobby()).teams).toEqual([]);
  });

  it('ranking de times usa a média dos membros', () => {
    const s = run(firstQuestion({ teams: { count: 2, mode: 'auto' } }), answer('ana', ['b'], T0), {
      type: 'CLOSE_QUESTION',
    });
    expect(liveResult(s).teams.map((t) => [t.team, t.score])).toEqual([
      ['A', 1000],
      ['B', 0],
    ]);
  });
});

describe('respostas', () => {
  it.each([
    ['jogador desconhecido', answer('x', ['b'], T0), 'PLAYER_NOT_FOUND'],
    ['outra pergunta', answer('ana', ['b'], T0, 'q2'), 'WRONG_QUESTION'],
    ['depois do prazo', answer('ana', ['b'], T0 + 20_001), 'DEADLINE_PASSED'],
    ['resposta inválida', answer('ana', ['z'], T0), 'UNKNOWN_OPTION'],
  ] as const)('rejeita %s', (_label, event, error) => {
    expect(errorOf(firstQuestion(), event)).toBe(error);
  });

  it('aceita resposta exatamente no prazo', () => {
    expect(errorOf(firstQuestion(), answer('ana', ['b'], T0 + 20_000))).toBeNull();
  });

  it('só uma resposta por pergunta (RF-10)', () => {
    const s = run(firstQuestion(), answer('ana', ['b'], T0 + 1));
    expect(errorOf(s, answer('ana', ['c'], T0 + 2))).toBe('ALREADY_ANSWERED');
  });

  it('não aceita resposta fora de QUESTION_OPEN', () => {
    expect(errorOf(lobby(), answer('ana', ['b'], T0))).toBe('INVALID_PHASE');
    const closed = run(firstQuestion(), { type: 'CLOSE_QUESTION' });
    expect(errorOf(closed, answer('ana', ['b'], T0))).toBe('INVALID_PHASE');
  });

  it('quem não respondeu leva 0 e zera o streak', () => {
    const s = run(firstQuestion(), answer('ana', ['b'], T0), { type: 'CLOSE_QUESTION' });
    expect(s.lastOutcomes.bia).toMatchObject({ answered: false, points: 0, streak: 0 });
  });

  it('haveAllAnswered ignora desconectados e é falso fora de QUESTION_OPEN', () => {
    let s = run(firstQuestion(), { type: 'LEAVE', playerId: 'bia' });
    expect(haveAllAnswered(s)).toBe(false);
    s = run(s, answer('ana', ['b'], T0));
    expect(haveAllAnswered(s)).toBe(true);
    expect(haveAllAnswered(lobby())).toBe(false);

    const allOffline = run(
      firstQuestion(),
      { type: 'LEAVE', playerId: 'ana' },
      { type: 'LEAVE', playerId: 'bia' },
    );
    expect(haveAllAnswered(allOffline)).toBe(false);
  });
});

describe('pausa', () => {
  it('o tempo pausado não conta para o jogador', () => {
    let s = run(firstQuestion(), { type: 'PAUSE', now: T0 + 5_000 });
    expect(s).toMatchObject({ phase: 'PAUSED', pausedFrom: 'QUESTION_OPEN' });
    expect(errorOf(s, answer('ana', ['b'], T0 + 6_000))).toBe('INVALID_PHASE');

    // 30 s de pausa: prazo e abertura andam 30 s.
    s = run(s, { type: 'RESUME', now: T0 + 35_000 });
    expect(s).toMatchObject({ phase: 'QUESTION_OPEN', deadline: T0 + 50_000, pausedFrom: null });

    // Respondeu 10 s depois de retomar = 15 s de jogo (5 antes + 10 depois).
    s = run(s, answer('ana', ['b'], T0 + 45_000), { type: 'CLOSE_QUESTION' });
    expect(s.lastOutcomes.ana).toMatchObject({ timeMs: 15_000, points: 625 });
  });

  it('pausa em fase sem timer volta à mesma fase', () => {
    const s = run(
      firstQuestion(),
      { type: 'CLOSE_QUESTION' },
      { type: 'REVEAL' },
      { type: 'PAUSE', now: T0 },
      { type: 'RESUME', now: T0 + 1_000 },
    );
    expect(s.phase).toBe('REVEAL');
  });

  it.each(['LOBBY', 'PAUSED'])('não pausa em %s', (phase) => {
    const s = phase === 'LOBBY' ? lobby() : run(firstQuestion(), { type: 'PAUSE', now: T0 });
    expect(errorOf(s, { type: 'PAUSE', now: T0 })).toBe('INVALID_PHASE');
  });

  it('RESUME sem pausa falha', () => {
    expect(errorOf(firstQuestion(), { type: 'RESUME', now: T0 })).toBe('INVALID_PHASE');
  });
});

describe('encerrar', () => {
  it('no meio do jogo vai ao pódio e descarta a pergunta aberta', () => {
    const s = run(firstQuestion(), answer('ana', ['b'], T0), { type: 'END' });
    expect(s).toMatchObject({ phase: 'PODIUM', answers: {} });
    expect(s.players.every((p) => p.score === 0)).toBe(true);
  });

  it('pausado também vai ao pódio, limpando a pausa', () => {
    const s = run(firstQuestion(), { type: 'PAUSE', now: T0 }, { type: 'END' });
    expect(s).toMatchObject({ phase: 'PODIUM', pausedFrom: null, pausedAt: null });
  });

  it('não encerra de novo no pódio ou depois', () => {
    const podium = run(firstQuestion(), { type: 'END' });
    expect(errorOf(podium, { type: 'END' })).toBe('INVALID_PHASE');
    expect(errorOf(run(podium, { type: 'FINISH' }), { type: 'END' })).toBe('INVALID_PHASE');
  });
});

describe('transições inválidas', () => {
  it.each<[string, () => LiveState, LiveEvent]>([
    ['COUNTDOWN_DONE fora do COUNTDOWN', () => lobby(), { type: 'COUNTDOWN_DONE', now: T0 }],
    ['CLOSE_QUESTION fora de QUESTION_OPEN', () => lobby(), { type: 'CLOSE_QUESTION' }],
    ['REVEAL antes de fechar', () => firstQuestion(), { type: 'REVEAL' }],
    ['SHOW_LEADERBOARD antes do reveal', () => firstQuestion(), { type: 'SHOW_LEADERBOARD' }],
    ['NEXT fora do LEADERBOARD', () => firstQuestion(), { type: 'NEXT', now: T0 }],
    ['FINISH fora do PODIUM', () => firstQuestion(), { type: 'FINISH' }],
  ])('%s', (_label, makeState, event) => {
    expect(errorOf(makeState(), event)).toBe('INVALID_PHASE');
  });
});
