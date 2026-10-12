import type { LiveSettings } from '@devquiz/shared';
import { applyOutcome, createPlayer } from './player.js';
import { buildMatchResult, type MatchResult } from './results.js';
import { scoreAnswer, validateAnswer, type AnswerError } from './scoring.js';
import { assignTeamsBalanced, smallestTeam, teamIds } from './teams.js';
import type { EngineQuestion, EngineResult, PlayerStats, QuestionOutcome } from './types.js';

/** Capacidade de uma sala (seção 2 do PRD). */
export const MAX_PLAYERS = 20;

export type LivePhase =
  | 'LOBBY'
  | 'COUNTDOWN'
  | 'QUESTION_OPEN'
  | 'QUESTION_CLOSED'
  | 'REVEAL'
  | 'LEADERBOARD'
  | 'PODIUM'
  | 'FINISHED'
  | 'PAUSED';

type ActivePhase = Exclude<LivePhase, 'PAUSED'>;

const PAUSABLE: readonly ActivePhase[] = [
  'COUNTDOWN',
  'QUESTION_OPEN',
  'QUESTION_CLOSED',
  'REVEAL',
  'LEADERBOARD',
];

export interface LiveAnswer {
  choice: readonly string[];
  /** Medido no servidor: `now` do envio menos a abertura da pergunta, descontadas as pausas. */
  timeMs: number;
}

export interface LiveState {
  phase: LivePhase;
  /** Fase para onde o RESUME volta. Só preenchida em PAUSED. */
  pausedFrom: ActivePhase | null;
  pausedAt: number | null;
  settings: LiveSettings;
  /** Ids dos times (`[]` sem modo times). */
  teams: string[];
  questions: EngineQuestion[];
  /** -1 antes da primeira pergunta. */
  currentIndex: number;
  questionOpenedAt: number | null;
  deadline: number | null;
  /** Respostas da pergunta atual, por jogador. */
  answers: Record<string, LiveAnswer>;
  /** Resultado da última pergunta fechada, por jogador (para o reveal). */
  lastOutcomes: Record<string, QuestionOutcome>;
  /** Em ordem de entrada na sala. */
  players: PlayerStats[];
  connected: Record<string, boolean>;
}

export type LiveEvent =
  | { type: 'JOIN'; playerId: string; nickname: string; team?: string }
  | { type: 'LEAVE'; playerId: string }
  | { type: 'KICK'; playerId: string }
  | { type: 'CHOOSE_TEAM'; playerId: string; team: string }
  | { type: 'START'; now: number }
  | { type: 'COUNTDOWN_DONE'; now: number }
  | {
      type: 'SUBMIT_ANSWER';
      playerId: string;
      questionId: string;
      choice: readonly string[];
      now: number;
    }
  | { type: 'CLOSE_QUESTION' }
  | { type: 'REVEAL' }
  | { type: 'SHOW_LEADERBOARD' }
  | { type: 'NEXT'; now: number }
  | { type: 'PAUSE'; now: number }
  | { type: 'RESUME'; now: number }
  | { type: 'END' }
  | { type: 'FINISH' };

export type LiveError =
  | 'INVALID_PHASE'
  | 'ROOM_FULL'
  | 'GAME_IN_PROGRESS'
  | 'PLAYER_NOT_FOUND'
  | 'NO_PLAYERS'
  | 'TEAMS_DISABLED'
  | 'TEAM_CHOICE_DISABLED'
  | 'UNKNOWN_TEAM'
  | 'WRONG_QUESTION'
  | 'ALREADY_ANSWERED'
  | 'DEADLINE_PASSED'
  | AnswerError;

type Result = EngineResult<LiveState, LiveError>;

const ok = (state: LiveState): Result => ({ ok: true, state });
const fail = (error: LiveError): Result => ({ ok: false, error });

/** Cria a sala no LOBBY. As perguntas já vêm sorteadas pelo servidor. */
export function createLiveMatch(settings: LiveSettings, questions: EngineQuestion[]): LiveState {
  if (questions.length === 0)
    throw new RangeError('Uma partida precisa de pelo menos uma pergunta');
  return {
    phase: 'LOBBY',
    pausedFrom: null,
    pausedAt: null,
    settings,
    teams: settings.teams ? teamIds(settings.teams.count) : [],
    questions,
    currentIndex: -1,
    questionOpenedAt: null,
    deadline: null,
    answers: {},
    lastOutcomes: {},
    players: [],
    connected: {},
  };
}

export function currentQuestion(state: LiveState): EngineQuestion | undefined {
  return state.questions[state.currentIndex];
}

function findPlayer(state: LiveState, playerId: string): PlayerStats | undefined {
  return state.players.find((p) => p.id === playerId);
}

function openQuestion(state: LiveState, index: number, now: number): LiveState {
  return {
    ...state,
    phase: 'QUESTION_OPEN',
    currentIndex: index,
    questionOpenedAt: now,
    deadline: now + state.settings.timeLimitSec * 1000,
    answers: {},
  };
}

function join(state: LiveState, event: Extract<LiveEvent, { type: 'JOIN' }>): Result {
  if (state.phase === 'FINISHED') return fail('INVALID_PHASE');

  // Reconexão (RF-12): o jogador volta com a pontuação preservada, em qualquer fase.
  if (findPlayer(state, event.playerId)) {
    return ok({ ...state, connected: { ...state.connected, [event.playerId]: true } });
  }

  if (state.phase !== 'LOBBY') return fail('GAME_IN_PROGRESS');
  if (state.players.length >= MAX_PLAYERS) return fail('ROOM_FULL');

  let team: string | null = null;
  if (state.settings.teams?.mode === 'choice') {
    if (event.team !== undefined && !state.teams.includes(event.team)) return fail('UNKNOWN_TEAM');
    team = event.team ?? smallestTeam(state.players, state.teams);
  }

  return ok({
    ...state,
    players: [...state.players, createPlayer(event.playerId, event.nickname, team)],
    connected: { ...state.connected, [event.playerId]: true },
  });
}

function chooseTeam(state: LiveState, event: Extract<LiveEvent, { type: 'CHOOSE_TEAM' }>): Result {
  if (state.phase !== 'LOBBY') return fail('INVALID_PHASE');
  if (!state.settings.teams) return fail('TEAMS_DISABLED');
  if (state.settings.teams.mode !== 'choice') return fail('TEAM_CHOICE_DISABLED');
  if (!state.teams.includes(event.team)) return fail('UNKNOWN_TEAM');
  if (!findPlayer(state, event.playerId)) return fail('PLAYER_NOT_FOUND');
  return ok({
    ...state,
    players: state.players.map((p) => (p.id === event.playerId ? { ...p, team: event.team } : p)),
  });
}

function start(state: LiveState): Result {
  if (state.phase !== 'LOBBY') return fail('INVALID_PHASE');
  if (state.players.length === 0) return fail('NO_PLAYERS');

  let players = state.players;
  if (state.settings.teams?.mode === 'auto') {
    const assignment = assignTeamsBalanced(
      players.map((p) => p.id),
      state.teams,
    );
    players = players.map((p) => ({ ...p, team: assignment[p.id] ?? null }));
  }
  return ok({ ...state, phase: 'COUNTDOWN', players });
}

function submitAnswer(
  state: LiveState,
  event: Extract<LiveEvent, { type: 'SUBMIT_ANSWER' }>,
): Result {
  if (state.phase !== 'QUESTION_OPEN') return fail('INVALID_PHASE');
  const question = currentQuestion(state);
  if (!question || state.questionOpenedAt === null || state.deadline === null) {
    return fail('INVALID_PHASE');
  }
  if (!findPlayer(state, event.playerId)) return fail('PLAYER_NOT_FOUND');
  if (event.questionId !== question.id) return fail('WRONG_QUESTION');
  // RF-10: uma resposta por pergunta.
  if (event.playerId in state.answers) return fail('ALREADY_ANSWERED');
  if (event.now > state.deadline) return fail('DEADLINE_PASSED');
  const invalid = validateAnswer(question, event.choice);
  if (invalid) return fail(invalid);

  const timeMs = Math.max(0, event.now - state.questionOpenedAt);
  return ok({
    ...state,
    answers: { ...state.answers, [event.playerId]: { choice: event.choice, timeMs } },
  });
}

/** Fecha a pergunta e pontua todos os jogadores; quem não respondeu leva 0 e zera o streak. */
function closeQuestion(state: LiveState): Result {
  if (state.phase !== 'QUESTION_OPEN') return fail('INVALID_PHASE');
  const question = currentQuestion(state);
  if (!question) return fail('INVALID_PHASE');

  const lastOutcomes: Record<string, QuestionOutcome> = {};
  const players = state.players.map((player) => {
    const answer = state.answers[player.id];
    const outcome = scoreAnswer({
      question,
      choice: answer?.choice ?? null,
      timeMs: answer?.timeMs ?? null,
      timeLimitMs: state.settings.timeLimitSec * 1000,
      previousStreak: player.streak,
      useDifficultyMultiplier: state.settings.difficultyMultiplier,
    });
    lastOutcomes[player.id] = outcome;
    return applyOutcome(player, question, outcome);
  });

  return ok({ ...state, phase: 'QUESTION_CLOSED', players, lastOutcomes });
}

function resume(state: LiveState, now: number): Result {
  if (state.phase !== 'PAUSED' || state.pausedFrom === null || state.pausedAt === null) {
    return fail('INVALID_PHASE');
  }
  // O tempo pausado não conta para o jogador: abertura e prazo andam junto.
  const pausedFor = Math.max(0, now - state.pausedAt);
  const shift = (t: number | null) => (t === null ? null : t + pausedFor);
  return ok({
    ...state,
    phase: state.pausedFrom,
    pausedFrom: null,
    pausedAt: null,
    questionOpenedAt: shift(state.questionOpenedAt),
    deadline: shift(state.deadline),
  });
}

export function liveReducer(state: LiveState, event: LiveEvent): Result {
  switch (event.type) {
    case 'JOIN':
      return join(state, event);

    case 'LEAVE':
      if (!findPlayer(state, event.playerId)) return fail('PLAYER_NOT_FOUND');
      return ok({ ...state, connected: { ...state.connected, [event.playerId]: false } });

    case 'KICK': {
      if (state.phase === 'FINISHED') return fail('INVALID_PHASE');
      if (!findPlayer(state, event.playerId)) return fail('PLAYER_NOT_FOUND');
      const { [event.playerId]: _answer, ...answers } = state.answers;
      const { [event.playerId]: _connected, ...connected } = state.connected;
      return ok({
        ...state,
        players: state.players.filter((p) => p.id !== event.playerId),
        answers,
        connected,
      });
    }

    case 'CHOOSE_TEAM':
      return chooseTeam(state, event);

    case 'START':
      return start(state);

    case 'COUNTDOWN_DONE':
      if (state.phase !== 'COUNTDOWN') return fail('INVALID_PHASE');
      return ok(openQuestion(state, 0, event.now));

    case 'SUBMIT_ANSWER':
      return submitAnswer(state, event);

    case 'CLOSE_QUESTION':
      return closeQuestion(state);

    case 'REVEAL':
      if (state.phase !== 'QUESTION_CLOSED') return fail('INVALID_PHASE');
      return ok({ ...state, phase: 'REVEAL' });

    case 'SHOW_LEADERBOARD':
      if (state.phase !== 'REVEAL') return fail('INVALID_PHASE');
      return ok({ ...state, phase: 'LEADERBOARD' });

    case 'NEXT': {
      if (state.phase !== 'LEADERBOARD') return fail('INVALID_PHASE');
      const next = state.currentIndex + 1;
      if (next < state.questions.length) return ok(openQuestion(state, next, event.now));
      return ok({ ...state, phase: 'PODIUM' });
    }

    case 'PAUSE':
      if (!PAUSABLE.includes(state.phase as ActivePhase)) return fail('INVALID_PHASE');
      return ok({
        ...state,
        phase: 'PAUSED',
        pausedFrom: state.phase as ActivePhase,
        pausedAt: event.now,
      });

    case 'RESUME':
      return resume(state, event.now);

    case 'END':
      // Encerrar no lobby descarta a sala; durante o jogo vai ao pódio com as perguntas já fechadas
      // (uma pergunta aberta é descartada, sem pontuar).
      if (state.phase === 'LOBBY') return ok({ ...state, phase: 'FINISHED' });
      if (state.phase === 'PODIUM' || state.phase === 'FINISHED') return fail('INVALID_PHASE');
      return ok({ ...state, phase: 'PODIUM', pausedFrom: null, pausedAt: null, answers: {} });

    case 'FINISH':
      if (state.phase !== 'PODIUM') return fail('INVALID_PHASE');
      return ok({ ...state, phase: 'FINISHED' });
  }
}

/** Todos os jogadores conectados já responderam: o servidor pode fechar a pergunta antes do prazo. */
export function haveAllAnswered(state: LiveState): boolean {
  if (state.phase !== 'QUESTION_OPEN') return false;
  const online = state.players.filter((p) => state.connected[p.id]);
  return online.length > 0 && online.every((p) => p.id in state.answers);
}

/** Quantas respostas cada alternativa recebeu na pergunta atual (para o reveal). */
export function answerDistribution(state: LiveState): Record<string, number> {
  const question = currentQuestion(state);
  const distribution: Record<string, number> = {};
  for (const id of question?.optionIds ?? []) distribution[id] = 0;
  for (const answer of Object.values(state.answers)) {
    for (const id of answer.choice) distribution[id] = (distribution[id] ?? 0) + 1;
  }
  return distribution;
}

export function liveResult(state: LiveState): MatchResult {
  return buildMatchResult(state.players, state.teams);
}
