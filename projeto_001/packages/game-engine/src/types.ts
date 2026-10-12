import type { Category, Difficulty, QuestionType } from '@devquiz/shared';

/** Pergunta como a engine a vê: inclui a resposta correta, então só existe no servidor. */
export interface EngineQuestion {
  id: string;
  type: QuestionType;
  category: Category;
  difficulty: Difficulty;
  optionIds: readonly string[];
  correct: readonly string[];
}

/** Resultado de um jogador em uma pergunta, já pontuado. */
export interface QuestionOutcome {
  questionId: string;
  answered: boolean;
  /** Só é `true` com a resposta exata; acerto parcial de multi_select não conta. */
  correct: boolean;
  /** Fração de acerto, de 0 a 1 (multi_select pode ser parcial). */
  fraction: number;
  /** Tempo medido no servidor, do envio da pergunta até a resposta. `null` se não respondeu. */
  timeMs: number | null;
  basePoints: number;
  streakBonus: number;
  multiplier: number;
  points: number;
  /** Streak depois desta pergunta. */
  streak: number;
}

export interface CategoryStats {
  correct: number;
  total: number;
}

export interface PlayerStats {
  id: string;
  nickname: string;
  team: string | null;
  score: number;
  correctCount: number;
  answeredCount: number;
  streak: number;
  maxStreak: number;
  /** Soma dos tempos de todas as respostas enviadas (para o desempate). */
  totalAnswerTimeMs: number;
  /** Soma dos tempos só das respostas corretas (para o badge "Mais rápido"). */
  correctAnswerTimeMs: number;
  byCategory: Record<Category, CategoryStats>;
}

export type EngineResult<S, E extends string> = { ok: true; state: S } | { ok: false; error: E };
