import { z } from 'zod';

// Placeholder do M0: os schemas e o contrato de eventos (seção 13 do PRD) entram a partir do M1.
export const categorySchema = z.enum(['IA', 'WORKFLOW', 'PROGRAMACAO']);
export type Category = z.infer<typeof categorySchema>;

export const difficultySchema = z.enum(['facil', 'medio', 'dificil']);
export type Difficulty = z.infer<typeof difficultySchema>;
