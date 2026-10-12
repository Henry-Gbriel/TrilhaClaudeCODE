import type { SoloConfig } from '@devquiz/shared';
import { applyOutcome, createPlayer } from './player.js';
import { buildMatchResult, type MatchResult } from './results.js';
import { scoreAnswer, validateAnswer, type AnswerError } from './scoring.js';
import type { EngineQuestion, EngineResult, PlayerStats, QuestionOutcome } from './types.js';

export type SoloPhase = 'CONFIG' | 'QUESTION' | 'FEEDBACK' | 'SUMMARY';

export interface SoloState {
  phase: SoloPhase;
  config: SoloConfig;
  questions: EngineQuestion[];
  /** -1 antes da primeira pergunta. */
  currentIndex: number;
  questionOpenedAt: number | null;
  /** `null` sem timer. */
  deadline: number | null;
  player: PlayerStats;
  /** Um resultado por pergunta respondida ou expirada, na ordem. */
  outcomes: QuestionOutcome[];
}

export type SoloEvent =
  | { type: 'START'; questions: EngineQuestion[]; now: number }
  | { type: 'SUBMIT_ANSWER'; questionId: string; choice: readonly string[]; now: number }
  | { type: 'EXPIRE'; now: number }
  | { type: 'NEXT'; now: number };

export type SoloError =
  | 'INVALID_PHASE'
  | 'NO_QUESTIONS'
  | 'WRONG_QUESTION'
  | 'NO_TIMER'
  | 'DEADLINE_NOT_REACHED'
  | AnswerError;

type Result = EngineResult<SoloState, SoloError>;

const ok = (state: SoloState): Result => ({ ok: true, state });
const fail = (error: SoloError): Result => ({ ok: false, error });

export function createSoloSession(
  playerId: string,
  nickname: string,
  config: SoloConfig,
): SoloState {
  return {
    phase: 'CONFIG',
    config,
    questions: [],
    currentIndex: -1,
    questionOpenedAt: null,
    deadline: null,
    player: createPlayer(playerId, nickname),
    outcomes: [],
  };
}

export function currentSoloQuestion(state: SoloState): EngineQuestion | undefined {
  return state.questions[state.currentIndex];
}

function timeLimitMs(state: SoloState): number | null {
  return state.config.timeLimitSec === null ? null : state.config.timeLimitSec * 1000;
}

function openQuestion(state: SoloState, index: number, now: number): SoloState {
  const limit = timeLimitMs(state);
  return {
    ...state,
    phase: 'QUESTION',
    currentIndex: index,
    questionOpenedAt: now,
    deadline: limit === null ? null : now + limit,
  };
}

/** Pontua a pergunta atual e vai para o FEEDBACK. `choice` null = expirou sem resposta. */
function finishQuestion(
  state: SoloState,
  question: EngineQuestion,
  choice: readonly string[] | null,
  now: number,
): SoloState {
  const timeMs = choice === null ? null : Math.max(0, now - (state.questionOpenedAt ?? now));
  // Mesma pontuação da sala ao vivo; o multiplicador de dificuldade é opção do host, então não vale no solo.
  const outcome = scoreAnswer({
    question,
    choice,
    timeMs,
    timeLimitMs: timeLimitMs(state),
    previousStreak: state.player.streak,
    useDifficultyMultiplier: false,
  });
  return {
    ...state,
    phase: 'FEEDBACK',
    player: applyOutcome(state.player, question, outcome),
    outcomes: [...state.outcomes, outcome],
  };
}

export function soloReducer(state: SoloState, event: SoloEvent): Result {
  switch (event.type) {
    case 'START':
      if (state.phase !== 'CONFIG') return fail('INVALID_PHASE');
      if (event.questions.length === 0) return fail('NO_QUESTIONS');
      return ok(openQuestion({ ...state, questions: event.questions }, 0, event.now));

    case 'SUBMIT_ANSWER': {
      const question = currentSoloQuestion(state);
      if (state.phase !== 'QUESTION' || !question) return fail('INVALID_PHASE');
      if (event.questionId !== question.id) return fail('WRONG_QUESTION');
      const invalid = validateAnswer(question, event.choice);
      if (invalid) return fail(invalid);
      // Resposta depois do prazo conta como não respondida (o tempo é medido no servidor).
      const late = state.deadline !== null && event.now > state.deadline;
      return ok(finishQuestion(state, question, late ? null : event.choice, event.now));
    }

    case 'EXPIRE': {
      const question = currentSoloQuestion(state);
      if (state.phase !== 'QUESTION' || !question) return fail('INVALID_PHASE');
      if (state.deadline === null) return fail('NO_TIMER');
      if (event.now < state.deadline) return fail('DEADLINE_NOT_REACHED');
      return ok(finishQuestion(state, question, null, event.now));
    }

    case 'NEXT': {
      if (state.phase !== 'FEEDBACK') return fail('INVALID_PHASE');
      const next = state.currentIndex + 1;
      if (next < state.questions.length) return ok(openQuestion(state, next, event.now));
      return ok({ ...state, phase: 'SUMMARY', questionOpenedAt: null, deadline: null });
    }
  }
}

/** Último resultado (para o FEEDBACK logo após a resposta). */
export function lastSoloOutcome(state: SoloState): QuestionOutcome | undefined {
  return state.outcomes.at(-1);
}

export function soloResult(state: SoloState): MatchResult {
  return buildMatchResult([state.player]);
}
