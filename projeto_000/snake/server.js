const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SCORES_FILE = path.join(__dirname, 'scores.json');
const MAX_SCORE = 4000; // 20×20 grid, 10 pts por comida

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readScores() {
  if (!fs.existsSync(SCORES_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(SCORES_FILE, 'utf-8'));
  } catch (err) {
    // Bug #6: loga erro em vez de silenciar perda de dados
    console.error('scores.json corrompido, reiniciando lista:', err.message);
    return [];
  }
}

// Bug #6: escrita atômica via arquivo temporário + rename
function writeScores(scores) {
  const tmp = SCORES_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(scores, null, 2));
  fs.renameSync(tmp, SCORES_FILE);
}

// Bug #7: retorna no máximo 100 entradas (cliente só exibe 10)
app.get('/api/scores', (req, res) => {
  res.json(readScores().slice(0, 100));
});

app.post('/api/scores', (req, res) => {
  const { score } = req.body;
  // Bug #5: rejeita NaN, Infinity e valores acima do máximo possível
  if (typeof score !== 'number' || !isFinite(score) || score < 0 || score > MAX_SCORE) {
    return res.status(400).json({ error: 'Score inválido' });
  }
  const scores = readScores();
  const entry = { score, date: new Date().toISOString() };
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  // Bug #2: try/catch explícito para que erros de I/O retornem 500 limpo
  try {
    writeScores(scores);
  } catch (err) {
    console.error('Erro ao salvar pontuação:', err);
    return res.status(500).json({ error: 'Erro ao salvar pontuação' });
  }
  // Bug #9: retorna a lista atualizada para evitar segundo GET no cliente
  res.json({ ok: true, scores: scores.slice(0, 100) });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
