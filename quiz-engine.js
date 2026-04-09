// Walmart Quiz - Game Engine
// Handles team management, scoring (speed-based), and rankings

const MAX_POINTS = 1000;
const TIME_LIMIT = 15; // seconds per question

let players = [];
let currentQuestion = 0;
let timerInterval = null;
let timerStart = 0;
let elapsedSeconds = 0;
let buzzedPlayer = null;
let questionActive = false;
let wrongBuzzers = []; // players who buzzed wrong on current question

function addPlayer() {
  const input = document.getElementById('player-input');
  const name = input.value.trim();
  if (!name) return;
  if (players.find(p => p.name.toLowerCase() === name.toLowerCase())) {
    shakeElement(input);
    return;
  }
  players.push({ name, score: 0, correctCount: 0, totalTime: 0, answers: [] });
  input.value = '';
  input.focus();
  renderPlayerList();
  updateStartButton();
}

function removePlayer(idx) {
  players.splice(idx, 1);
  renderPlayerList();
  updateStartButton();
}

function renderPlayerList() {
  const list = document.getElementById('player-list');
  if (players.length === 0) {
    list.innerHTML = '<p class="text-gray-400 text-sm text-center py-4">No team members yet — add at least 2!</p>';
    return;
  }
  list.innerHTML = players.map((p, i) => `
    <div class="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-100 fade-in">
      <div class="flex items-center gap-3">
        <span class="w-8 h-8 rounded-full bg-walmart-blue text-white font-bold flex items-center justify-center text-sm">${p.name[0].toUpperCase()}</span>
        <span class="font-medium text-gray-700">${p.name}</span>
      </div>
      <button onclick="removePlayer(${i})" class="text-gray-400 hover:text-red-500 transition-colors text-lg" aria-label="Remove ${p.name}">&times;</button>
    </div>
  `).join('');
}

function updateStartButton() {
  const btn = document.getElementById('start-btn');
  btn.disabled = players.length < 2;
  btn.classList.toggle('opacity-50', players.length < 2);
  btn.classList.toggle('cursor-not-allowed', players.length < 2);
}

function shakeElement(el) {
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 500);
}

// ───────── Quiz Flow ─────────

function startQuiz() {
  document.getElementById('setup-screen').classList.add('hidden');
  document.getElementById('quiz-screen').classList.remove('hidden');
  document.getElementById('q-total').textContent = questions.length;
  showQuestion();
}

function showQuestion() {
  buzzedPlayer = null;
  wrongBuzzers = [];
  questionActive = true;
  elapsedSeconds = 0;

  const q = questions[currentQuestion];
  document.getElementById('q-current').textContent = currentQuestion + 1;
  document.getElementById('progress-bar').style.width = ((currentQuestion) / questions.length * 100) + '%';
  document.getElementById('category-badge').textContent = q.category;
  document.getElementById('question-text').textContent = q.question;
  document.getElementById('feedback').classList.add('hidden');
  document.getElementById('answer-section').classList.add('hidden');
  document.getElementById('next-container').classList.add('hidden');
  document.getElementById('timer-display').textContent = TIME_LIMIT;
  document.getElementById('timer-display').classList.remove('text-red-500');

  // Show buzzer panel
  renderBuzzerPanel();
  document.getElementById('buzzer-section').classList.remove('hidden');

  // Start timer
  timerStart = Date.now();
  clearInterval(timerInterval);
  timerInterval = setInterval(updateTimer, 100);

  // Animate card
  const card = document.getElementById('question-card');
  card.classList.remove('fade-in');
  void card.offsetWidth;
  card.classList.add('fade-in');
}

function updateTimer() {
  elapsedSeconds = (Date.now() - timerStart) / 1000;
  const remaining = Math.max(0, TIME_LIMIT - elapsedSeconds);
  const display = document.getElementById('timer-display');
  display.textContent = remaining.toFixed(1);
  if (remaining <= 5) display.classList.add('text-red-500');

  // Update timer ring
  const pct = (remaining / TIME_LIMIT) * 100;
  document.getElementById('timer-ring').style.background =
    `conic-gradient(#0053e2 ${pct}%, #e5e7eb ${pct}%)`;

  if (remaining <= 0) {
    clearInterval(timerInterval);
    questionActive = false;
    timeUp();
  }
}

function timeUp() {
  document.getElementById('buzzer-section').classList.add('hidden');
  const q = questions[currentQuestion];
  const labels = ['A', 'B', 'C', 'D'];
  showFeedback(false, `⏱️ Time's up! The correct answer was <strong>${labels[q.answer]}. ${q.options[q.answer]}</strong>. ${q.explanation}`);
  showNextButton();
}

// ───────── Buzzer ─────────

function renderBuzzerPanel() {
  const panel = document.getElementById('buzzer-buttons');
  panel.innerHTML = players.map((p, i) => {
    const disabled = wrongBuzzers.includes(i);
    return `<button
      onclick="buzzIn(${i})"
      ${disabled ? 'disabled' : ''}
      class="buzzer-btn px-5 py-3 rounded-xl font-bold text-white transition-all
        ${disabled ? 'bg-gray-300 cursor-not-allowed line-through' : 'bg-walmart-blue hover:bg-walmart-blueHover shadow-md hover:shadow-lg hover:scale-105'}
        focus:outline-none focus:ring-4 focus:ring-blue-300"
      aria-label="${p.name} buzz in">
      🖐️ ${p.name}
    </button>`;
  }).join('');
}

function buzzIn(playerIdx) {
  if (!questionActive || wrongBuzzers.includes(playerIdx)) return;
  buzzedPlayer = playerIdx;
  const buzzTime = (Date.now() - timerStart) / 1000;

  // Pause timer
  clearInterval(timerInterval);

  // Show who buzzed in
  document.getElementById('buzzer-section').classList.add('hidden');
  document.getElementById('buzzed-player-name').textContent = players[playerIdx].name;
  document.getElementById('buzz-time').textContent = buzzTime.toFixed(2);

  // Show answer options
  renderAnswerOptions();
  document.getElementById('answer-section').classList.remove('hidden');
}

function renderAnswerOptions() {
  const q = questions[currentQuestion];
  const container = document.getElementById('options-container');
  container.innerHTML = '';
  const labels = ['A', 'B', 'C', 'D'];
  q.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn w-full text-left px-5 py-4 rounded-xl border-2 border-gray-200 bg-gray-50 hover:border-walmart-blue hover:bg-blue-50 font-medium text-gray-700 flex items-center gap-4 focus:outline-none focus:ring-4 focus:ring-blue-200';
    btn.setAttribute('aria-label', labels[idx] + ': ' + opt);
    btn.innerHTML = `<span class="flex-shrink-0 w-9 h-9 rounded-lg bg-walmart-blue/10 text-walmart-blue font-bold flex items-center justify-center text-sm">${labels[idx]}</span><span>${opt}</span>`;
    btn.onclick = () => submitAnswer(idx);
    container.appendChild(btn);
  });
}

function submitAnswer(selectedIdx) {
  const q = questions[currentQuestion];
  const isCorrect = selectedIdx === q.answer;
  const buzzTime = parseFloat(document.getElementById('buzz-time').textContent);
  const player = players[buzzedPlayer];
  const labels = ['A', 'B', 'C', 'D'];

  // Highlight correct/wrong answers
  const buttons = document.querySelectorAll('.option-btn');
  buttons.forEach((btn, i) => {
    btn.disabled = true;
    btn.classList.remove('hover:border-walmart-blue', 'hover:bg-blue-50');
    if (i === q.answer) {
      btn.classList.remove('border-gray-200', 'bg-gray-50');
      btn.classList.add('border-green-500', 'bg-green-50', 'text-green-800', 'pop');
      btn.querySelector('span:first-child').classList.remove('bg-walmart-blue/10', 'text-walmart-blue');
      btn.querySelector('span:first-child').classList.add('bg-green-500', 'text-white');
    } else if (i === selectedIdx && !isCorrect) {
      btn.classList.remove('border-gray-200', 'bg-gray-50');
      btn.classList.add('border-red-400', 'bg-red-50', 'text-red-700');
      btn.querySelector('span:first-child').classList.remove('bg-walmart-blue/10', 'text-walmart-blue');
      btn.querySelector('span:first-child').classList.add('bg-red-500', 'text-white');
    } else {
      btn.classList.add('opacity-50');
    }
  });

  if (isCorrect) {
    // Speed-based scoring: faster = more points (linear scale)
    const points = Math.round(MAX_POINTS * (1 - buzzTime / TIME_LIMIT));
    player.score += points;
    player.correctCount++;
    player.totalTime += buzzTime;
    player.answers.push({ qIdx: currentQuestion, correct: true, points, time: buzzTime });
    questionActive = false;

    showFeedback(true, `🎯 <strong>${player.name}</strong> scores <strong>${points} pts</strong> in ${buzzTime.toFixed(2)}s! ${q.explanation}`);
    showNextButton();
    updateMiniLeaderboard();
  } else {
    player.answers.push({ qIdx: currentQuestion, correct: false, points: 0, time: buzzTime });
    wrongBuzzers.push(buzzedPlayer);

    // Check if everyone has buzzed wrong
    if (wrongBuzzers.length >= players.length) {
      questionActive = false;
      showFeedback(false, `Nobody got it! The correct answer was <strong>${labels[q.answer]}. ${q.options[q.answer]}</strong>. ${q.explanation}`);
      showNextButton();
    } else {
      // Let others try — resume timer
      showFeedback(false, `❌ <strong>${player.name}</strong> got it wrong! Others can still buzz in!`);
      setTimeout(() => {
        document.getElementById('answer-section').classList.add('hidden');
        document.getElementById('feedback').classList.add('hidden');
        renderBuzzerPanel();
        document.getElementById('buzzer-section').classList.remove('hidden');
        // Resume timer from where we left off
        timerStart = Date.now() - (elapsedSeconds * 1000);
        timerInterval = setInterval(updateTimer, 100);
      }, 1500);
    }
  }
}

function showFeedback(isCorrect, html) {
  const feedback = document.getElementById('feedback');
  feedback.classList.remove('hidden', 'bg-green-50', 'text-green-800', 'bg-red-50', 'text-red-800', 'border-green-200', 'border-red-200');
  if (isCorrect) {
    feedback.classList.add('bg-green-50', 'text-green-800', 'border', 'border-green-200');
  } else {
    feedback.classList.add('bg-red-50', 'text-red-800', 'border', 'border-red-200');
  }
  feedback.innerHTML = html;
}

function showNextButton() {
  document.getElementById('next-container').classList.remove('hidden');
  if (currentQuestion === questions.length - 1) {
    document.querySelector('#next-container button').textContent = 'See Final Rankings 🏆';
  }
}

function updateMiniLeaderboard() {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const board = document.getElementById('mini-leaderboard');
  board.innerHTML = sorted.map((p, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
    return `<div class="flex items-center justify-between text-sm py-1">
      <span class="font-medium text-gray-700">${medal} ${p.name}</span>
      <span class="font-bold text-walmart-blue">${p.score.toLocaleString()} pts</span>
    </div>`;
  }).join('');
  board.parentElement.classList.remove('hidden');
}

function nextQuestion() {
  currentQuestion++;
  if (currentQuestion >= questions.length) {
    showFinalResults();
  } else {
    showQuestion();
  }
}

// ───────── Final Results ─────────

function showFinalResults() {
  clearInterval(timerInterval);
  document.getElementById('quiz-screen').classList.add('hidden');

  const sorted = [...players].sort((a, b) => b.score - a.score || a.totalTime - b.totalTime);
  const resultsDiv = document.getElementById('results-screen');
  resultsDiv.classList.remove('hidden');

  const medals = ['🥇', '🥈', '🥉'];
  const podiumColors = ['from-yellow-400 to-yellow-500', 'from-gray-300 to-gray-400', 'from-amber-600 to-amber-700'];

  // Build podium for top 3
  const top3 = sorted.slice(0, 3);
  const podiumHTML = top3.map((p, i) => {
    const heights = ['h-40', 'h-28', 'h-20'];
    return `<div class="flex flex-col items-center ${i === 0 ? 'order-2' : i === 1 ? 'order-1' : 'order-3'}">
      <div class="text-4xl mb-2">${medals[i]}</div>
      <div class="font-bold text-gray-800 text-lg mb-1">${p.name}</div>
      <div class="text-walmart-blue font-black text-xl mb-2">${p.score.toLocaleString()}</div>
      <div class="w-24 ${heights[i]} rounded-t-xl bg-gradient-to-b ${podiumColors[i]} flex items-end justify-center pb-2">
        <span class="text-white font-bold text-2xl">${i + 1}</span>
      </div>
    </div>`;
  }).join('');

  // Full ranking table
  const rankingHTML = sorted.map((p, i) => {
    const medal = i < 3 ? medals[i] : `<span class="text-gray-400 font-bold">#${i + 1}</span>`;
    const avgTime = p.correctCount > 0 ? (p.totalTime / p.correctCount).toFixed(2) + 's' : '—';
    const accuracy = Math.round((p.correctCount / questions.length) * 100);
    const barWidth = sorted[0].score > 0 ? (p.score / sorted[0].score * 100) : 0;
    return `<div class="flex items-center gap-4 py-3 ${i < sorted.length - 1 ? 'border-b border-gray-100' : ''}">
      <div class="w-10 text-center text-lg">${medal}</div>
      <div class="flex-1">
        <div class="flex items-center justify-between mb-1">
          <span class="font-bold text-gray-800">${p.name}</span>
          <span class="font-black text-walmart-blue">${p.score.toLocaleString()} pts</span>
        </div>
        <div class="w-full bg-gray-100 rounded-full h-2 mb-1">
          <div class="bg-walmart-blue h-2 rounded-full transition-all" style="width:${barWidth}%"></div>
        </div>
        <div class="flex gap-4 text-xs text-gray-500">
          <span>✅ ${p.correctCount}/${questions.length} (${accuracy}%)</span>
          <span>⚡ Avg: ${avgTime}</span>
        </div>
      </div>
    </div>`;
  }).join('');

  resultsDiv.innerHTML = `
    <div class="bg-white rounded-2xl shadow-lg p-10 border border-gray-100 text-center mb-6 fade-in">
      <div class="text-6xl mb-4">🏆</div>
      <h2 class="text-3xl font-bold text-gray-800 mb-2">Final Rankings</h2>
      <p class="text-gray-500 mb-8">Great game, everyone! Here are the results:</p>
      <div class="flex items-end justify-center gap-6 mb-8">${podiumHTML}</div>
    </div>
    <div class="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-6 fade-in">
      <h3 class="text-lg font-bold text-gray-800 mb-4">📊 Full Leaderboard</h3>
      ${rankingHTML}
    </div>
    <div class="text-center fade-in">
      <button onclick="restartQuiz()" class="bg-walmart-blue hover:bg-walmart-blueHover text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all focus:outline-none focus:ring-4 focus:ring-blue-300">Play Again 🔄</button>
    </div>`;

  launchConfetti();
}

function restartQuiz() {
  currentQuestion = 0;
  players.forEach(p => { p.score = 0; p.correctCount = 0; p.totalTime = 0; p.answers = []; });
  document.getElementById('results-screen').classList.add('hidden');
  document.getElementById('results-screen').innerHTML = '';
  document.getElementById('setup-screen').classList.remove('hidden');
  document.getElementById('mini-leaderboard').parentElement.classList.add('hidden');
}

function launchConfetti() {
  const colors = ['#0053e2', '#ffc220', '#ea1100', '#2a8703', '#ffffff'];
  for (let i = 0; i < 80; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = Math.random() * 2 + 's';
    piece.style.animationDuration = (2 + Math.random() * 2) + 's';
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    piece.style.width = (6 + Math.random() * 8) + 'px';
    piece.style.height = (6 + Math.random() * 8) + 'px';
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 5000);
  }
}

// Enter key to add player
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('player-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addPlayer();
  });
});
