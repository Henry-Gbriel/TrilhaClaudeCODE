import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CATEGORIES, type Question } from '@devquiz/shared';
import { loadQuestions, OUTPUT_FILE, sqlString, toSql } from './generate.js';

const question: Question = {
  slug: 'tst-001',
  type: 'true_false',
  category: 'IA',
  tags: [],
  difficulty: 'facil',
  prompt: "It's a trap",
  options: [
    { id: 'a', text: 'Verdadeiro' },
    { id: 'b', text: "D'água" },
  ],
  correct: ['a'],
  explanation: 'x',
};

function dirWith(files: Record<string, unknown>): string {
  const dir = mkdtempSync(join(tmpdir(), 'seed-'));
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), JSON.stringify(content));
  }
  return dir;
}

describe('perguntas do seed', () => {
  const questions = loadQuestions();

  it('tem 20 perguntas por categoria', () => {
    for (const category of CATEGORIES) {
      expect(questions.filter((q) => q.category === category)).toHaveLength(20);
    }
  });

  it('cobre todos os tipos e dificuldades em cada categoria', () => {
    for (const category of CATEGORIES) {
      const own = questions.filter((q) => q.category === category);
      expect(new Set(own.map((q) => q.type))).toEqual(
        new Set(['multiple_choice', 'true_false', 'code_output', 'multi_select']),
      );
      expect(new Set(own.map((q) => q.difficulty))).toEqual(new Set(['facil', 'medio', 'dificil']));
    }
  });

  it('não concentra a resposta correta na mesma letra', () => {
    const single = questions.filter(
      (q) => q.type === 'multiple_choice' || q.type === 'code_output',
    );
    const counts = new Map<string, number>();
    for (const q of single)
      counts.set(q.correct[0] ?? '', (counts.get(q.correct[0] ?? '') ?? 0) + 1);
    for (const count of counts.values()) expect(count / single.length).toBeLessThan(0.4);
  });

  it('o questions.sql commitado está atualizado (rode `pnpm db:seed:gen`)', () => {
    expect(readFileSync(OUTPUT_FILE, 'utf8')).toBe(toSql(questions));
  });
});

describe('loadQuestions', () => {
  it('rejeita pergunta inválida, apontando arquivo e slug', () => {
    const dir = dirWith({ 'x.json': [{ ...question, correct: ['z'] }] });
    expect(() => loadQuestions(dir)).toThrow(/x\.json\[0\] \(tst-001\)/);
  });

  it('rejeita slug repetido entre arquivos', () => {
    const dir = dirWith({ 'a.json': [question], 'b.json': [question] });
    expect(() => loadQuestions(dir)).toThrow('slug repetido: tst-001');
  });

  it('rejeita arquivo que não é lista', () => {
    expect(() => loadQuestions(dirWith({ 'a.json': question }))).toThrow();
  });
});

describe('toSql', () => {
  it('escapa aspas simples', () => {
    expect(sqlString("D'água")).toBe("'D''água'");
    expect(sqlString(undefined)).toBe('null');
    const sql = toSql([question]);
    expect(sql).toContain("'It''s a trap'");
    expect(sql).toContain(`'[{"id":"a","text":"Verdadeiro"},{"id":"b","text":"D''água"}]'::jsonb`);
    expect(sql).toContain("'{}'::text[]");
  });

  it('faz upsert por slug sem sobrescrever o status da curadoria', () => {
    const sql = toSql([{ ...question, tags: ['a', 'b'], code: 'x = 1', codeLang: 'python' }]);
    expect(sql).toContain("array['a', 'b']::text[]");
    expect(sql).toContain("'x = 1', 'python'");
    expect(sql).toContain('on conflict (slug) do update set');
    expect(sql).toContain('code_lang = excluded.code_lang');
    expect(sql).not.toContain('status = excluded.status');
  });
});
