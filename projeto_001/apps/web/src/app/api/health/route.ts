import { connection } from 'next/server';

export async function GET() {
  // Força execução a cada requisição (com Cache Components, um GET puro seria pré-renderizado).
  await connection();
  return Response.json({ status: 'ok', uptime: process.uptime() });
}
