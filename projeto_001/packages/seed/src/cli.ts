import { writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import { loadQuestions, OUTPUT_FILE, toSql } from './generate.js';

const questions = loadQuestions();
writeFileSync(OUTPUT_FILE, toSql(questions));
console.log(`${String(questions.length)} perguntas → ${relative(process.cwd(), OUTPUT_FILE)}`);
