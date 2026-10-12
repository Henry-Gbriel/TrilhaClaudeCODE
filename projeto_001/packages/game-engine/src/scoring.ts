import type { Difficulty } from '@devquiz/shared';
import type { EngineQuestion, QuestionOutcome } from './types.js';

export const MAX_POINTS = 1000;

export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  facil: 1,
  medio: 1.25,
  dificil: 1.5,
};

/**
 * Pontos por velocidade: `round(1000 * (1 - (t / t_limite) / 2))`, entre 500 e 1000.
 * Sem timer (`timeLimitMs` null, modo solo) vale o máximo.
 */
export function basePoints(timeMs: number, timeLimitMs: number | null): number {
  if (timeLimitMs === null) return MAX_POINTS;
  const ratio = Math.min(Math.max(timeMs / timeLimitMs, 0), 1);
  return Math.round(MAX_POINTS * (1 - ratio / 2));
}

/** Bônus a partir de 3 acertos seguidos: `+100 * min(streak - 2, 5)`. */
export function streakBonus(streak: number): number {
  return streak >= 3 ? 100 * Math.min(streak - 2, 5) : 0;
}

export type AnswerError =
  'EMPTY_ANSWER' | 'DUPLICATE_OPTION' | 'UNKNOWN_OPTION' | 'TOO_MANY_OPTIONS';

/** Valida a forma da resposta (não se está certa). Tipos de escolha única aceitam uma opção só. */
export function validateAnswer(
  question: EngineQuestion,
  choice: readonly string[],
): AnswerError | null {
  if (choice.length === 0) return 'EMPTY_ANSWER';
  if (new Set(choice).size !== choice.length) return 'DUPLICATE_OPTION';
  if (choice.some((id) => !question.optionIds.includes(id))) return 'UNKNOWN_OPTION';
  if (question.type !== 'multi_select' && choice.length > 1) return 'TOO_MANY_OPTIONS';
  return null;
}

/**
 * Fração de acerto. Escolha única: 0 ou 1.
 * multi_select: `(acertos - erros marcados) / total de corretas`, com mínimo 0.
 */
export function answerFraction(question: EngineQuestion, choice: readonly string[]): number {
  const correct = new Set(question.correct);
  const hits = choice.filter((id) => correct.has(id)).length;
  const wrongs = choice.length - hits;
  if (question.type !== 'multi_select') return hits === 1 && wrongs === 0 ? 1 : 0;
  return Math.max(0, (hits - wrongs) / correct.size);
}

export interface ScoreInput {
  question: EngineQuestion;
  /** `null` = não respondeu a tempo. */
  choice: readonly string[] | null;
  timeMs: number | null;
  timeLimitMs: number | null;
  /** Streak antes desta pergunta. */
  previousStreak: number;
  useDifficultyMultiplier: boolean;
}

/**
 * Pontua uma resposta.
 * - Acerto exato: pontos de velocidade + bônus de streak, tudo vezes o multiplicador.
 * - multi_select parcial: fração dos pontos de velocidade, sem bônus, e o streak zera.
 * - Erro ou sem resposta: 0 pontos e o streak zera.
 */
export function scoreAnswer(input: ScoreInput): QuestionOutcome {
  const { question, choice, timeMs, timeLimitMs, previousStreak } = input;
  const multiplier = input.useDifficultyMultiplier ? DIFFICULTY_MULTIPLIER[question.difficulty] : 1;

  if (choice === null || timeMs === null) {
    return {
      questionId: question.id,
      answered: false,
      correct: false,
      fraction: 0,
      timeMs: null,
      basePoints: 0,
      streakBonus: 0,
      multiplier,
      points: 0,
      streak: 0,
    };
  }

  const fraction = answerFraction(question, choice);
  const correct = fraction === 1;
  const streak = correct ? previousStreak + 1 : 0;
  const base = Math.round(basePoints(timeMs, timeLimitMs) * fraction);
  const bonus = correct ? streakBonus(streak) : 0;

  return {
    questionId: question.id,
    answered: true,
    correct,
    fraction,
    timeMs,
    basePoints: base,
    streakBonus: bonus,
    multiplier,
    points: Math.round((base + bonus) * multiplier),
    streak,
  };
}
