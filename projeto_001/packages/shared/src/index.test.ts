import { describe, expect, it } from 'vitest';
import {
  CATEGORIES,
  categorySchema,
  difficultySchema,
  AVATAR_EMOJIS,
  DISPLAY_NAME_MAX,
  liveSettingsSchema,
  profileUpdateSchema,
  questionSchema,
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

describe('questionSchema', () => {
  const base = {
    slug: 'ia-001',
    type: 'multiple_choice',
    category: 'IA',
    tags: ['rag'],
    difficulty: 'medio',
    prompt: 'O que é RAG?',
    options: [
      { id: 'a', text: 'Um modelo' },
      { id: 'b', text: 'Busca + geração' },
      { id: 'c', text: 'Um banco' },
    ],
    correct: ['b'],
    explanation: 'RAG recupera contexto antes de gerar.',
  };
  const tf = {
    ...base,
    type: 'true_false',
    options: [
      { id: 'a', text: 'Verdadeiro' },
      { id: 'b', text: 'Falso' },
    ],
  };

  it('aceita perguntas válidas de cada tipo', () => {
    expect(questionSchema.safeParse(base).success).toBe(true);
    expect(questionSchema.safeParse(tf).success).toBe(true);
    expect(
      questionSchema.safeParse({ ...base, type: 'multi_select', correct: ['a', 'c'] }).success,
    ).toBe(true);
    expect(
      questionSchema.safeParse({
        ...base,
        type: 'code_output',
        code: 'print(1)',
        codeLang: 'python',
      }).success,
    ).toBe(true);
  });

  it.each([
    ['slug fora do padrão', { slug: 'IA_1' }],
    ['resposta fora das alternativas', { correct: ['z'] }],
    ['ids repetidos', { options: [base.options[0], base.options[0]] }],
    ['resposta repetida', { type: 'multi_select', correct: ['a', 'a'] }],
    ['multiple_choice com 2 corretas', { correct: ['a', 'b'] }],
    ['multi_select com 1 correta', { type: 'multi_select', correct: ['a'] }],
    [
      'multi_select com 2 alternativas',
      { type: 'multi_select', options: tf.options, correct: ['a', 'b'] },
    ],
    ['true_false com 3 alternativas', { type: 'true_false' }],
    ['code_output sem código', { type: 'code_output' }],
    ['codeLang sem code', { codeLang: 'python' }],
    ['mais de 4 alternativas', { options: 'abcde'.split('').map((id) => ({ id, text: id })) }],
    ['campo desconhecido', { status: 'published' }],
  ])('rejeita %s', (_label, patch) => {
    expect(questionSchema.safeParse({ ...base, ...patch }).success).toBe(false);
  });
});

describe('profileUpdateSchema', () => {
  it('aceita nome e emoji da lista, aparando espaços', () => {
    expect(profileUpdateSchema.parse({ displayName: '  Ana  ', avatarEmoji: '🚀' })).toEqual({
      displayName: 'Ana',
      avatarEmoji: '🚀',
    });
    expect(AVATAR_EMOJIS[0]).toBe('🙂');
  });

  it.each([
    ['nome vazio', { displayName: '   ', avatarEmoji: '🙂' }],
    ['nome longo', { displayName: 'x'.repeat(DISPLAY_NAME_MAX + 1), avatarEmoji: '🙂' }],
    ['emoji fora da lista', { displayName: 'Ana', avatarEmoji: '💩' }],
  ])('rejeita %s', (_label, input) => {
    expect(profileUpdateSchema.safeParse(input).success).toBe(false);
  });
});
