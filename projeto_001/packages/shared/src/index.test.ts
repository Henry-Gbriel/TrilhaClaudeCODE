import { describe, expect, it } from 'vitest';
import { categorySchema, difficultySchema } from './index.js';

describe('schemas base', () => {
  it('aceita valores do PRD e rejeita desconhecidos', () => {
    expect(categorySchema.parse('IA')).toBe('IA');
    expect(difficultySchema.safeParse('impossivel').success).toBe(false);
  });
});
