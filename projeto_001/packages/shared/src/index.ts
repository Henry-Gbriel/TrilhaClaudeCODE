import { z } from 'zod';

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
