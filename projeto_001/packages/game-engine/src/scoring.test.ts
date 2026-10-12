import { describe, expect, it } from 'vitest';
import {
  answerFraction,
  basePoints,
  DIFFICULTY_MULTIPLIER,
  scoreAnswer,
  streakBonus,
  validateAnswer,
  type ScoreInput,
} from './scoring.js';
import { multiSelect, question } from './test-fixtures.js';

describe('basePoints', () => {
  it.each([
    [0, 1000],
    [5_000, 875],
    [10_000, 750],
    [20_000, 500],
  ])('t = %i ms de 20 s vale %i', (timeMs, expected) => {
    expect(basePoints(timeMs, 20_000)).toBe(expected);
  });

  it('fica entre 500 e 1000 mesmo com tempo fora do intervalo', () => {
    expect(basePoints(-100, 20_000)).toBe(1000);
    expect(basePoints(25_000, 20_000)).toBe(500);
  });

  it('arredonda para o inteiro mais próximo', () => {
    // 1000 * (1 - (1/3)/2) = 833.33...
    expect(basePoints(10_000, 30_000)).toBe(833);
  });

  it('sem timer vale o máximo', () => {
    expect(basePoints(999_999, null)).toBe(1000);
  });
});

describe('streakBonus', () => {
  it.each([
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 100],
    [4, 200],
    [7, 500],
    [12, 500],
  ])('streak %i dá +%i', (streak, bonus) => {
    expect(streakBonus(streak)).toBe(bonus);
  });
});

describe('validateAnswer', () => {
  const single = question('q1');
  const multi = multiSelect('q2');

  it('aceita respostas bem formadas', () => {
    expect(validateAnswer(single, ['a'])).toBeNull();
    expect(validateAnswer(multi, ['a', 'b', 'c'])).toBeNull();
  });

  it.each([
    ['vazia', single, [], 'EMPTY_ANSWER'],
    ['repetida', multi, ['a', 'a'], 'DUPLICATE_OPTION'],
    ['alternativa inexistente', single, ['z'], 'UNKNOWN_OPTION'],
    ['duas opções em escolha única', single, ['a', 'b'], 'TOO_MANY_OPTIONS'],
  ] as const)('rejeita resposta %s', (_label, q, choice, error) => {
    expect(validateAnswer(q, choice)).toBe(error);
  });
});

describe('answerFraction', () => {
  it('escolha única é 0 ou 1', () => {
    expect(answerFraction(question('q'), ['b'])).toBe(1);
    expect(answerFraction(question('q'), ['a'])).toBe(0);
  });

  it('true_false e code_output seguem a escolha única', () => {
    const tf = question('tf', { type: 'true_false', optionIds: ['v', 'f'], correct: ['v'] });
    expect(answerFraction(tf, ['v'])).toBe(1);
    expect(answerFraction(tf, ['f'])).toBe(0);
  });

  it.each([
    [['a', 'c'], 1],
    [['a'], 0.5],
    [['a', 'b'], 0],
    [['a', 'c', 'b'], 0.5],
    [['b', 'd'], 0],
    [['a', 'b', 'd'], 0],
  ])('multi_select %j vale %d', (choice, expected) => {
    expect(answerFraction(multiSelect('m'), choice)).toBe(expected);
  });
});

describe('scoreAnswer', () => {
  const base = (overrides: Partial<ScoreInput> = {}): ScoreInput => ({
    question: question('q'),
    choice: ['b'],
    timeMs: 0,
    timeLimitMs: 20_000,
    previousStreak: 0,
    useDifficultyMultiplier: false,
    ...overrides,
  });

  it('acerto soma pontos de velocidade e incrementa o streak', () => {
    const outcome = scoreAnswer(base({ timeMs: 10_000, previousStreak: 1 }));
    expect(outcome).toMatchObject({
      answered: true,
      correct: true,
      basePoints: 750,
      streakBonus: 0,
      points: 750,
      streak: 2,
    });
  });

  it('a partir do 3º acerto seguido soma o bônus de streak', () => {
    const outcome = scoreAnswer(base({ previousStreak: 2 }));
    expect(outcome).toMatchObject({ streak: 3, basePoints: 1000, streakBonus: 100, points: 1100 });
  });

  it('erro zera pontos e streak', () => {
    const outcome = scoreAnswer(base({ choice: ['a'], previousStreak: 5 }));
    expect(outcome).toMatchObject({ answered: true, correct: false, points: 0, streak: 0 });
  });

  it('sem resposta zera pontos e streak, sem tempo registrado', () => {
    const outcome = scoreAnswer(base({ choice: null, timeMs: null, previousStreak: 4 }));
    expect(outcome).toMatchObject({
      answered: false,
      correct: false,
      timeMs: null,
      points: 0,
      streak: 0,
    });
  });

  it.each(Object.entries(DIFFICULTY_MULTIPLIER))(
    'multiplicador de %s (%dx) vale sobre pontos e bônus',
    (difficulty, multiplier) => {
      const q = question('q', { difficulty: difficulty as 'facil' | 'medio' | 'dificil' });
      const outcome = scoreAnswer(
        base({ question: q, previousStreak: 2, useDifficultyMultiplier: true }),
      );
      expect(outcome.multiplier).toBe(multiplier);
      expect(outcome.points).toBe(Math.round(1100 * multiplier));
    },
  );

  it('sem a opção do host, o multiplicador é 1', () => {
    const q = question('q', { difficulty: 'dificil' });
    expect(scoreAnswer(base({ question: q })).points).toBe(1000);
  });

  it('multi_select parcial pontua a fração, sem bônus, e zera o streak', () => {
    const outcome = scoreAnswer(
      base({ question: multiSelect('m'), choice: ['a'], timeMs: 0, previousStreak: 4 }),
    );
    expect(outcome).toMatchObject({
      correct: false,
      fraction: 0.5,
      basePoints: 500,
      streakBonus: 0,
      points: 500,
      streak: 0,
    });
  });

  it('multi_select exato conta como acerto', () => {
    const outcome = scoreAnswer(base({ question: multiSelect('m'), choice: ['c', 'a'] }));
    expect(outcome).toMatchObject({ correct: true, fraction: 1, points: 1000, streak: 1 });
  });
});
