import type { LiveSettings } from '@devquiz/shared';
import type { EngineQuestion } from './types.js';

/** Pergunta de escolha única com alternativas a–d; a correta é `b`. */
export function question(id: string, overrides: Partial<EngineQuestion> = {}): EngineQuestion {
  return {
    id,
    type: 'multiple_choice',
    category: 'IA',
    difficulty: 'facil',
    optionIds: ['a', 'b', 'c', 'd'],
    correct: ['b'],
    ...overrides,
  };
}

/** multi_select com alternativas a–d; corretas `a` e `c`. */
export function multiSelect(id: string, overrides: Partial<EngineQuestion> = {}): EngineQuestion {
  return question(id, { type: 'multi_select', correct: ['a', 'c'], ...overrides });
}

export function liveSettings(overrides: Partial<LiveSettings> = {}): LiveSettings {
  return {
    categories: ['IA', 'WORKFLOW', 'PROGRAMACAO'],
    difficulties: ['facil', 'medio', 'dificil'],
    questionCount: 5,
    timeLimitSec: 20,
    teams: null,
    difficultyMultiplier: false,
    ...overrides,
  };
}
