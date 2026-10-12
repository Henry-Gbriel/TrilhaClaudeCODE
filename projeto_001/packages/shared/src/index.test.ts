import { describe, expect, it } from 'vitest';
import {
  CATEGORIES,
  categorySchema,
  difficultySchema,
  liveSettingsSchema,
  soloConfigSchema,
} from './index.js';

describe('enums de domínio', () => {
  it('aceita valores do PRD e rejeita desconhecidos', () => {
    expect(categorySchema.parse('IA')).toBe('IA');
    expect(CATEGORIES).toEqual(['IA', 'WORKFLOW', 'PROGRAMACAO']);
    expect(difficultySchema.safeParse('impossivel').success).toBe(false);
  });
});

describe('liveSettingsSchema', () => {
  const valid = {
    categories: ['IA'],
    difficulties: ['facil', 'medio'],
    questionCount: 10,
    timeLimitSec: 20,
    teams: { count: 2, mode: 'auto' },
    difficultyMultiplier: true,
  };

  it('aceita uma configuração válida, com e sem times', () => {
    expect(liveSettingsSchema.safeParse(valid).success).toBe(true);
    expect(liveSettingsSchema.safeParse({ ...valid, teams: null }).success).toBe(true);
  });

  it.each([
    ['questionCount abaixo de 5', { questionCount: 4 }],
    ['questionCount acima de 30', { questionCount: 31 }],
    ['tempo abaixo de 10 s', { timeLimitSec: 9 }],
    ['tempo acima de 60 s', { timeLimitSec: 61 }],
    ['1 time só', { teams: { count: 1, mode: 'auto' } }],
    ['5 times', { teams: { count: 5, mode: 'choice' } }],
    ['sem categorias', { categories: [] }],
  ])('rejeita %s', (_label, patch) => {
    expect(liveSettingsSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
});

describe('soloConfigSchema', () => {
  it('aceita 5, 10 ou 20 perguntas e timer opcional', () => {
    for (const questionCount of [5, 10, 20]) {
      const config = { categories: ['WORKFLOW'], difficulties: ['dificil'], questionCount };
      expect(soloConfigSchema.safeParse({ ...config, timeLimitSec: null }).success).toBe(true);
      expect(soloConfigSchema.safeParse({ ...config, timeLimitSec: 30 }).success).toBe(true);
    }
  });

  it('rejeita quantidade fora de 5/10/20', () => {
    const config = {
      categories: ['IA'],
      difficulties: ['facil'],
      questionCount: 15,
      timeLimitSec: null,
    };
    expect(soloConfigSchema.safeParse(config).success).toBe(false);
  });
});
