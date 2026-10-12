const GRID = 20;
const CELL = 20;
const SPEED = 140;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let snake, dir, nextDir, food, loop, score, highScore, lastScore;
let state = 'idle';

async function init() {
  highScore = 0;
  setupControls();
  setupTouch();
  await loadHistory();
  draw();
}

// ── Game flow ──────────────────────────────────────────────────────────────

function startGame() {
  score = 0;
  snake = [{x: 12, y: 10}, {x: 11, y: 10}, {x: 10, y: 10}];
  dir = {x: 1, y: 0};
  nextDir = {x: 1, y: 0};
  food = spawnFood();
  state = 'playing';

  hide('overlay-start');
  hide('overlay-gameover');
  updateUI();

  clearInterval(loop);
  loop = setInterval(tick, SPEED);
}

function tick() {
  dir = nextDir;
  const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};

  if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
    return endGame();
  }
  // Bug #1: exclui a cauda (último segmento), pois ela se move neste tick
  if (snake.slice(0, -1).some(s => s.x === head.x && s.y === head.y)) {
    return endGame();
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 10;
    if (score > highScore) highScore = score;
    updateUI();
    food = spawnFood();
  } else {
    snake.pop();
  }

  draw();
}

function endGame() {
  clearInterval(loop);
  state = 'gameover';
  lastScore = score;
  document.getElementById('final-score').textContent = score;
  show('overlay-gameover');
  saveScore(score);
}

// ── Drawing ────────────────────────────────────────────────────────────────

function draw() {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid
  ctx.strokeStyle = '#1e1e3a';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= GRID; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(canvas.width, i * CELL); ctx.stroke();
  }

  if (state === 'idle') return;

  // Food
  ctx.fillStyle = '#e94560';
  ctx.beginPath();
  ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
  ctx.fill();

  // Snake body
  snake.forEach((seg, i) => {
    ctx.fillStyle = i === 0 ? '#4ecca3' : '#2a9d72';
    roundRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, 3);
    ctx.fill();
  });

  // Eyes
  drawEyes(snake[0]);
}

function drawEyes(head) {
  const cx = head.x * CELL + CELL / 2;
  const cy = head.y * CELL + CELL / 2;
  let e1, e2;

  if      (dir.x === 1)  { e1 = {x: cx + 3, y: cy - 3}; e2 = {x: cx + 3, y: cy + 3}; }
  else if (dir.x === -1) { e1 = {x: cx - 3, y: cy - 3}; e2 = {x: cx - 3, y: cy + 3}; }
  else if (dir.y === -1) { e1 = {x: cx - 3, y: cy - 3}; e2 = {x: cx + 3, y: cy - 3}; }
  else                   { e1 = {x: cx - 3, y: cy + 3}; e2 = {x: cx + 3, y: cy + 3}; }

  ctx.fillStyle = '#0d0d1a';
  ctx.beginPath(); ctx.arc(e1.x, e1.y, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(e2.x, e2.y, 2, 0, Math.PI * 2); ctx.fill();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function spawnFood() {
  let pos;
  do {
    pos = {x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID)};
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  return pos;
}

// ── Controls ───────────────────────────────────────────────────────────────

function setupControls() {
  const KEY_MAP = {
    ArrowUp:    {x: 0,  y: -1},
    ArrowDown:  {x: 0,  y: 1},
    ArrowLeft:  {x: -1, y: 0},
    ArrowRight: {x: 1,  y: 0},
    w: {x: 0,  y: -1},
    s: {x: 0,  y: 1},
    a: {x: -1, y: 0},
    d: {x: 1,  y: 0},
  };

  document.addEventListener('keydown', e => {
    const newDir = KEY_MAP[e.key];
    if (!newDir) return;
    // Bug #3: compara contra nextDir (direção enfileirada), não dir (última aplicada)
    if (newDir.x === -nextDir.x && newDir.y === -nextDir.y) return;
    nextDir = newDir;
    // Bug #8: só bloqueia scroll quando o jogo está rodando
    if (state === 'playing') e.preventDefault();
  });
}

function setupTouch() {
  let startX, startY;

  canvas.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    e.preventDefault();
  }, {passive: false});

  canvas.addEventListener('touchend', e => {
    if (startX == null) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;

    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;

    let newDir;
    if (Math.abs(dx) > Math.abs(dy)) {
      newDir = dx > 0 ? {x: 1, y: 0} : {x: -1, y: 0};
    } else {
      newDir = dy > 0 ? {x: 0, y: 1} : {x: 0, y: -1};
    }

    // Bug #4: mesma correção do teclado — compara contra nextDir
    if (newDir.x === -nextDir.x && newDir.y === -nextDir.y) return;
    nextDir = newDir;
    startX = null;
    e.preventDefault();
  }, {passive: false});
}

// ── UI helpers ─────────────────────────────────────────────────────────────

function updateUI() {
  document.getElementById('score').textContent = score;
  document.getElementById('high-score').textContent = highScore;
}

function show(id) { document.getElementById(id).classList.remove('hidden'); }
function hide(id) { document.getElementById(id).classList.add('hidden'); }

// ── API ────────────────────────────────────────────────────────────────────

async function saveScore(pts) {
  // Bug #9: usa a lista retornada pelo POST em vez de fazer um segundo GET
  try {
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({score: pts}),
    });
    const data = await res.json();
    if (data.scores) {
      applyScores(data.scores);
    }
  } catch (err) {
    console.error('Erro ao salvar pontuação:', err);
  }
}

async function loadHistory() {
  try {
    const res = await fetch('/api/scores');
    const scores = await res.json();
    applyScores(scores);
  } catch (err) {
    console.error('Erro ao carregar histórico:', err);
  }
}

// Bug #10: ponto único para atualizar highScore + DOM + lista
function applyScores(scores) {
  if (scores.length > 0) {
    highScore = scores[0].score;
    updateUI();
  }
  renderHistory(scores);
}

function renderHistory(scores) {
  const list = document.getElementById('history-list');
  if (!scores.length) {
    list.innerHTML = '<div class="empty-history">Nenhuma partida registrada ainda</div>';
    return;
  }
  list.innerHTML = scores.slice(0, 10).map((s, i) => `
    <div class="history-item">
      <span class="rank">#${i + 1}</span>
      <span class="pts">${s.score} pts</span>
      <span class="date">${formatDate(s.date)}</span>
    </div>
  `).join('');
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' ' +
    d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});
}

// ── Share ──────────────────────────────────────────────────────────────────

async function shareScore() {
  const text = `🐍 Joguei o Jogo da Cobrinha e fiz ${lastScore} pontos! Consegue superar?`;

  if (navigator.share) {
    try {
      await navigator.share({title: 'Jogo da Cobrinha', text, url: window.location.href});
      return;
    } catch { /* usuário cancelou */ }
  }

  try {
    await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
    alert('Copiado para a área de transferência!');
  } catch {
    alert(text);
  }
}

// ── Start ──────────────────────────────────────────────────────────────────

init();
