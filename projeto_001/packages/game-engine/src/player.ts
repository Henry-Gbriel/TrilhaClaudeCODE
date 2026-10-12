import { CATEGORIES, type Category } from '@devquiz/shared';
import type { CategoryStats, EngineQuestion, PlayerStats, QuestionOutcome } from './types.js';

export function createPlayer(
  id: string,
  nickname: string,
  team: string | null = null,
): PlayerStats {
  const byCategory = Object.fromEntries(
    CATEGORIES.map((category) => [category, { correct: 0, total: 0 }]),
  ) as Record<Category, CategoryStats>;
  return {
    id,
    nickname,
    team,
    score: 0,
    correctCount: 0,
    answeredCount: 0,
    streak: 0,
    maxStreak: 0,
    totalAnswerTimeMs: 0,
    correctAnswerTimeMs: 0,
    byCategory,
  };
}

/** Soma o resultado de uma pergunta às estatísticas do jogador (sem mutar). */
export function applyOutcome(
  player: PlayerStats,
  question: EngineQuestion,
  outcome: QuestionOutcome,
): PlayerStats {
  const time = outcome.timeMs ?? 0;
  const category = player.byCategory[question.category];
  return {
    ...player,
    score: player.score + outcome.points,
    correctCount: player.correctCount + (outcome.correct ? 1 : 0),
    answeredCount: player.answeredCount + (outcome.answered ? 1 : 0),
    streak: outcome.streak,
    maxStreak: Math.max(player.maxStreak, outcome.streak),
    totalAnswerTimeMs: player.totalAnswerTimeMs + (outcome.answered ? time : 0),
    correctAnswerTimeMs: player.correctAnswerTimeMs + (outcome.correct ? time : 0),
    byCategory: {
      ...player.byCategory,
      [question.category]: {
        correct: category.correct + (outcome.correct ? 1 : 0),
        total: category.total + 1,
      },
    },
  };
}

/** Tempo médio das respostas enviadas; `null` se não respondeu nenhuma. */
export function averageAnswerTimeMs(player: PlayerStats): number | null {
  return player.answeredCount === 0 ? null : player.totalAnswerTimeMs / player.answeredCount;
}
