import { z } from 'zod';

export type { Database, Json } from './database.types.js';

// Enums de domínio (seções 4, 6 e 11 do PRD). Os valores batem com os enums do Postgres.
export const categorySchema = z.enum(['IA', 'WORKFLOW', 'PROGRAMACAO']);
export type Category = z.infer<typeof categorySchema>;
export const CATEGORIES = categorySchema.options;

export const difficultySchema = z.enum(['facil', 'medio', 'dificil']);
export type Difficulty = z.infer<typeof difficultySchema>;

export const questionTypeSchema = z.enum([
  'multiple_choice',
  'true_false',
  'code_output',
  'multi_select',
]);
export type QuestionType = z.infer<typeof questionTypeSchema>;

// Configuração da sala ao vivo (RF-04, seção 5.2).
export const teamModeSchema = z.enum(['auto', 'choice']);
export type TeamMode = z.infer<typeof teamModeSchema>;

export const liveSettingsSchema = z.object({
  categories: z.array(categorySchema).min(1),
  difficulties: z.array(difficultySchema).min(1),
  questionCount: z.number().int().min(5).max(30),
  timeLimitSec: z.number().int().min(10).max(60),
  teams: z
    .object({
      count: z.number().int().min(2).max(4),
      mode: teamModeSchema,
    })
    .nullable(),
  difficultyMultiplier: z.boolean(),
});
export type LiveSettings = z.infer<typeof liveSettingsSchema>;

// Configuração do modo solo (RF-13, seção 5.3). Timer opcional: null = sem timer.
export const soloConfigSchema = z.object({
  categories: z.array(categorySchema).min(1),
  difficulties: z.array(difficultySchema).min(1),
  questionCount: z.union([z.literal(5), z.literal(10), z.literal(20)]),
  timeLimitSec: z.number().int().min(10).max(60).nullable(),
});
export type SoloConfig = z.infer<typeof soloConfigSchema>;

// Pergunta completa, com a resposta (seções 6 e 11 do PRD). Só existe no servidor e no seed:
// o cliente nunca recebe `correct` nem `explanation` antes da revelação.
export const questionOptionSchema = z.object({
  id: z.string().regex(/^[a-z]$/),
  text: z.string().min(1),
});
export type QuestionOption = z.infer<typeof questionOptionSchema>;

export const questionSchema = z
  .object({
    slug: z.string().regex(/^[a-z]+-\d{3}$/),
    type: questionTypeSchema,
    category: categorySchema,
    tags: z.array(z.string().min(1)),
    difficulty: difficultySchema,
    prompt: z.string().min(1),
    code: z.string().min(1).optional(),
    codeLang: z.string().min(1).optional(),
    options: z.array(questionOptionSchema).min(2).max(4),
    correct: z.array(z.string()).min(1),
    explanation: z.string().min(1),
  })
  .strict()
  .superRefine((q, ctx) => {
    const ids = q.options.map((o) => o.id);
    const issue = (message: string, path: string) => {
      ctx.addIssue({ code: 'custom', message, path: [path] });
    };

    if (new Set(ids).size !== ids.length) issue('ids de alternativa repetidos', 'options');
    if (new Set(q.correct).size !== q.correct.length) issue('resposta repetida', 'correct');
    if (q.correct.some((id) => !ids.includes(id)))
      issue('resposta fora das alternativas', 'correct');

    if (q.type === 'true_false' && q.options.length !== 2)
      issue('true_false tem 2 alternativas', 'options');
    if (q.type === 'multi_select') {
      if (q.options.length < 3) issue('multi_select tem pelo menos 3 alternativas', 'options');
      if (q.correct.length < 2) issue('multi_select tem pelo menos 2 corretas', 'correct');
    } else if (q.correct.length !== 1) {
      issue(`${q.type} tem exatamente 1 correta`, 'correct');
    }

    if (q.type === 'code_output' && (q.code === undefined || q.codeLang === undefined)) {
      issue('code_output precisa de code e codeLang', 'code');
    }
    if (q.codeLang !== undefined && q.code === undefined) issue('codeLang sem code', 'codeLang');
  });
export type Question = z.infer<typeof questionSchema>;
