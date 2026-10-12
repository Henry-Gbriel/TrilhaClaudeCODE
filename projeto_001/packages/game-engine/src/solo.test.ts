import type { SoloConfig } from '@devquiz/shared';
import { describe, expect, it } from 'vitest';
import {
  createSoloSession,
  currentSoloQuestion,
  lastSoloOutcome,
  soloReducer,
  soloResult,
  type SoloEvent,
  type SoloState,
} from './solo.js';
import { question } from './test-fixtures.js';

const T0 = 5_000_000;
const QUESTIONS = [
  question('q1'),
  question('q2', { category: 'PROGRAMACAO', difficulty: 'dificil' }),
];

function session(timeLimitSec: number | null = 20): SoloState {
  const config: SoloConfig = {
    categories: ['IA', 'PROGRAMACAO'],
    difficulties: ['facil', 'dificil'],
    questionCount: 5,
    timeLimitSec,
  };
  return createSoloSession('u1', 'Ana', config);
}

function run(state: SoloState, ...events: SoloEvent[]): SoloState {
  return events.reduce((s, event) => {
    const result = soloReducer(s, event);
    if (!result.ok) throw new Error(`${event.type} rejeitado: ${result.error}`);
    return result.state;
  }, state);
}

function errorOf(state: SoloState, event: SoloEvent): string | null {
  const result = soloReducer(state, event);
  return result.ok ? null : result.error;
}

const start = (now = T0): SoloEvent => ({ type: 'START', questions: QUESTIONS, now });
const submit = (choice: string[], now: number, questionId = 'q1'): SoloEvent => ({
  type: 'SUBMIT_ANSWER',
  questionId,
  choice,
  now,
});

describe('sessão solo', () => {
  it('percorre CONFIG → QUESTION → FEEDBACK → … → SUMMARY', () => {
    let s = session();
    expect(s.phase).toBe('CONFIG');

    s = run(s, start());
    expect(s).toMatchObject({ phase: 'QUESTION', currentIndex: 0, deadline: T0 + 20_000 });
    expect(currentSoloQuestion(s)?.id).toBe('q1');

    s = run(s, submit(['b'], T0 + 10_000));
    expect(s.phase).toBe('FEEDBACK');
    expect(lastSoloOutcome(s)).toMatchObject({ correct: true, points: 750 });

    s = run(s, { type: 'NEXT', now: T0 + 30_000 }, submit(['a'], T0 + 31_000, 'q2'));
    expect(lastSoloOutcome(s)).toMatchObject({ correct: false, points: 0 });

    s = run(s, { type: 'NEXT', now: T0 + 40_000 });
    expect(s).toMatchObject({ phase: 'SUMMARY', deadline: null });
    expect(s.outcomes).toHaveLength(2);

    const result = soloResult(s);
    expect(result.ranking[0]?.player).toMatchObject({ score: 750, correctCount: 1 });
    expect(result.teams).toEqual([]);
    expect(result.badges).toContainEqual({
      kind: 'specialist',
      category: 'IA',
      playerId: 'u1',
      correct: 1,
    });
  });

  it('não aplica o multiplicador de dificuldade', () => {
    const s = run(
      session(),
      start(),
      submit(['b'], T0),
      { type: 'NEXT', now: T0 },
      submit(['b'], T0, 'q2'),
    );
    expect(lastSoloOutcome(s)).toMatchObject({ multiplier: 1, points: 1000 });
  });

  it('sem timer, acerto vale o máximo independente do tempo', () => {
    const s = run(session(null), start(), submit(['b'], T0 + 600_000));
    expect(s.deadline).toBeNull();
    expect(lastSoloOutcome(s)).toMatchObject({ points: 1000, timeMs: 600_000 });
  });

  it('resposta depois do prazo conta como não respondida', () => {
    const s = run(session(), start(), submit(['b'], T0 + 20_001));
    expect(lastSoloOutcome(s)).toMatchObject({ answered: false, points: 0 });
  });

  it('EXPIRE fecha a pergunta sem resposta, só depois do prazo', () => {
    const s = run(session(), start());
    expect(errorOf(s, { type: 'EXPIRE', now: T0 + 19_999 })).toBe('DEADLINE_NOT_REACHED');
    const expired = run(s, { type: 'EXPIRE', now: T0 + 20_000 });
    expect(lastSoloOutcome(expired)).toMatchObject({ answered: false, streak: 0 });
  });

  it('EXPIRE sem timer falha', () => {
    expect(errorOf(run(session(null), start()), { type: 'EXPIRE', now: T0 })).toBe('NO_TIMER');
  });

  it.each<[string, () => SoloState, SoloEvent, string]>([
    [
      'START sem perguntas',
      () => session(),
      { type: 'START', questions: [], now: T0 },
      'NO_QUESTIONS',
    ],
    ['START duas vezes', () => run(session(), start()), start(), 'INVALID_PHASE'],
    ['resposta antes do START', () => session(), submit(['b'], T0), 'INVALID_PHASE'],
    [
      'resposta de outra pergunta',
      () => run(session(), start()),
      submit(['b'], T0, 'q2'),
      'WRONG_QUESTION',
    ],
    ['resposta inválida', () => run(session(), start()), submit([], T0), 'EMPTY_ANSWER'],
    [
      'resposta no FEEDBACK',
      () => run(session(), start(), submit(['b'], T0)),
      submit(['b'], T0),
      'INVALID_PHASE',
    ],
    ['EXPIRE fora de QUESTION', () => session(), { type: 'EXPIRE', now: T0 }, 'INVALID_PHASE'],
    [
      'NEXT fora do FEEDBACK',
      () => run(session(), start()),
      { type: 'NEXT', now: T0 },
      'INVALID_PHASE',
    ],
  ])('rejeita %s', (_label, makeState, event, error) => {
    expect(errorOf(makeState(), event)).toBe(error);
  });
});
