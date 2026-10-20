import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { type Question, questionSchema } from '@devquiz/shared';

export const SEED_DIR = join(import.meta.dirname, '../../../supabase/seed');
export const QUESTIONS_DIR = join(SEED_DIR, 'questions');
export const OUTPUT_FILE = join(SEED_DIR, 'questions.sql');

/** Lê e valida todos os `*.json` de perguntas. Lança erro com arquivo e slug se algo estiver inválido. */
export function loadQuestions(dir = QUESTIONS_DIR): Question[] {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort();
  const questions: Question[] = [];

  for (const file of files) {
    const raw: unknown = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    const list = z.array(z.unknown()).parse(raw);
    list.forEach((item, i) => {
      const parsed = questionSchema.safeParse(item);
      if (!parsed.success) {
        const slug = (item as { slug?: unknown }).slug;
        throw new Error(
          `${file}[${String(i)}] (${String(slug)}): ${z.prettifyError(parsed.error)}`,
        );
      }
      questions.push(parsed.data);
    });
  }

  const seen = new Set<string>();
  for (const q of questions) {
    if (seen.has(q.slug)) throw new Error(`slug repetido: ${q.slug}`);
    seen.add(q.slug);
  }
  return questions;
}

/** Literal de string SQL (standard_conforming_strings: só a aspa simples precisa de escape). */
export function sqlString(value: string | undefined): string {
  return value === undefined ? 'null' : `'${value.replaceAll("'", "''")}'`;
}

function sqlTextArray(values: readonly string[]): string {
  return values.length === 0
    ? "'{}'::text[]"
    : `array[${values.map(sqlString).join(', ')}]::text[]`;
}

function sqlJsonb(value: unknown): string {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

const COLUMNS = [
  'slug',
  'type',
  'category',
  'tags',
  'difficulty',
  'prompt',
  'code',
  'code_lang',
  'options',
  'correct',
  'explanation',
  'status',
] as const;

/**
 * Gera um upsert por slug. Reaplicar atualiza o conteúdo, mas não o `status`:
 * uma pergunta arquivada pela curadoria (Table Editor) continua arquivada.
 */
export function toSql(questions: readonly Question[]): string {
  const rows = questions.map((q) =>
    [
      sqlString(q.slug),
      sqlString(q.type),
      sqlString(q.category),
      sqlTextArray(q.tags),
      sqlString(q.difficulty),
      sqlString(q.prompt),
      sqlString(q.code),
      sqlString(q.codeLang),
      sqlJsonb(q.options),
      sqlJsonb(q.correct),
      sqlString(q.explanation),
      "'published'",
    ].join(', '),
  );
  const updates = COLUMNS.filter((c) => c !== 'slug' && c !== 'status').map(
    (c) => `  ${c} = excluded.${c}`,
  );

  return [
    '-- GERADO por `pnpm db:seed:gen` a partir de supabase/seed/questions/*.json. Não edite à mão.',
    `insert into public.questions (${COLUMNS.join(', ')}) values`,
    rows.map((r) => `  (${r})`).join(',\n'),
    'on conflict (slug) do update set',
    updates.join(',\n') + ';',
    '',
  ].join('\n');
}
