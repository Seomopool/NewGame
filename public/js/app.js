// app.js
import { store } from "./store.js";

// ─ 로그인 ─
const loginView = document.getElementById("login-view");
const gameView = document.getElementById("game-view");
const nicknameInput = document.getElementById("nickname-input");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");

// ─ 스탯 요약 ─
const nameLabel = document.getElementById("player-name");
const academicLabel = document.getElementById("stat-academic");
const athleticLabel = document.getElementById("stat-athletic");
const totalLabel = document.getElementById("stat-total");
const logoutBtn = document.getElementById("logout-btn");

// ─ 연습 문제 ─
const problemText = document.getElementById("problem-text");
const answerInput = document.getElementById("answer-input");
const submitBtn = document.getElementById("submit-btn");
const skipBtn = document.getElementById("skip-btn");
const feedback = document.getElementById("quiz-feedback");

// ─ 순위 ─
const boardBody = document.getElementById("board-body");
const boardCol = document.getElementById("board-col");
const refreshBtn = document.getElementById("refresh-btn");

let currentNickname = null;
let currentProblemId = null;
let currentBoard = "total";

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function showStats(player) {
  nameLabel.textContent = player.nickname;
  academicLabel.textContent = player.academic;
  athleticLabel.textContent = player.athletic;
  totalLabel.textContent = player.academic + player.athletic;
  const best = document.getElementById("aim-best");
  if (best) best.textContent = player.aimBest ?? 0;
  const pkbest = document.getElementById("pk-best");
  if (pkbest) pkbest.textContent = player.pkBest ?? 0;
}

async function enterGame(player) {
  currentNickname = player.nickname;
  store.saveSession(player.nickname);
  showStats(player);
  loginView.hidden = true;
  gameView.hidden = false;
  await Promise.all([loadProblem(), loadBoard()]);
}

// ─── 로그인 ───
async function doLogin(nickname) {
  loginError.textContent = "";
  try {
    const { player } = await store.login(nickname);
    await enterGame(player);
  } catch (err) {
    loginError.textContent = err.message;
  }
}
loginBtn.addEventListener("click", () => doLogin(nicknameInput.value));
nicknameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(nicknameInput.value); });

// ─── 분야 탭 전환 ───
const panelAcademic = document.getElementById("panel-academic");
const panelAthletic = document.getElementById("panel-athletic");
const tabAcademic = document.getElementById("tab-academic");
const tabAthletic = document.getElementById("tab-athletic");

tabAcademic.addEventListener("click", () => switchPanel("academic"));
tabAthletic.addEventListener("click", () => switchPanel("athletic"));

function switchPanel(which) {
  const isAca = which === "academic";
  tabAcademic.classList.toggle("active", isAca);
  tabAthletic.classList.toggle("active", !isAca);
  panelAcademic.hidden = !isAca;
  panelAthletic.hidden = isAca;
  if (!isAca) resetSports(); // 운동 탭 들어오면 초기화
}

// ─── 연습 문제 ───
async function loadProblem() {
  feedback.textContent = ""; feedback.className = "feedback";
  answerInput.value = ""; problemText.textContent = "…";
  try {
    const { problemId, text } = await store.getProblem();
    currentProblemId = problemId;
    problemText.textContent = text + " = ?";
  } catch {
    problemText.textContent = "문제를 불러오지 못했어요";
  }
}
async function submitAnswer() {
  if (!currentProblemId) return;
  const val = answerInput.value.trim();
  if (val === "") return;
  submitBtn.disabled = true;
  try {
    const { correct, correctAnswer, player } = await store.submitAnswer(currentNickname, currentProblemId, Number(val));
    showStats(player);
    if (correct) { feedback.textContent = "정답! +10"; feedback.className = "feedback ok"; }
    else { feedback.textContent = `오답 (정답: ${correctAnswer})  -5`; feedback.className = "feedback no"; }
    currentProblemId = null;
    loadBoard();
    setTimeout(loadProblem, 900);
  } catch (err) {
    feedback.textContent = err.message; feedback.className = "feedback no";
    if (err.message.includes("만료")) setTimeout(loadProblem, 600);
  } finally { submitBtn.disabled = false; }
}
submitBtn.addEventListener("click", submitAnswer);
answerInput.addEventListener("keydown", (e) => { if (e.key === "Enter") submitAnswer(); });
skipBtn.addEventListener("click", loadProblem);

// ─── 순위 ───
function medal(rank) { return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank; }

document.querySelectorAll(".board-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    currentBoard = btn.dataset.board;
    document.querySelectorAll(".board-tab").forEach((b) => b.classList.toggle("active", b === btn));
    loadBoard();
  });
});

async function loadBoard() {
  try {
    const { ranking } = await store.getLeaderboard(currentBoard);
    boardCol.textContent = currentBoard === "academic" ? "학업" : currentBoard === "athletic" ? "운동" : "총합";
    boardBody.innerHTML = "";
    for (const row of ranking) {
      const tr = document.createElement("tr");
      if (currentNickname && row.nickname.toLowerCase() === currentNickname.toLowerCase()) tr.className = "me";
      const val = currentBoard === "academic" ? row.academic : currentBoard === "athletic" ? row.athletic : row.total;
      tr.innerHTML = `
        <td class="rank-medal">${medal(row.rank)}</td>
        <td>${escapeHtml(row.nickname)}</td>
        <td class="r">${val}</td>`;
      boardBody.appendChild(tr);
    }
    if (ranking.length === 0) {
      boardBody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--muted)">아직 순위가 없어요</td></tr>`;
    }
  } catch { /* 순위 실패는 조용히 무시 */ }
}
refreshBtn.addEventListener("click", loadBoard);

// ─── 시험 ───
const examOverlay = document.getElementById("exam-overlay");
const examTitle = document.getElementById("exam-title");
const examTimer = document.getElementById("exam-timer");
const timerFill = document.getElementById("timer-fill");
const examQuestions = document.getElementById("exam-questions");
const examSubmitBtn = document.getElementById("exam-submit");
const examCancelBtn = document.getElementById("exam-cancel");
const resultOverlay = document.getElementById("result-overlay");
const resultDelta = document.getElementById("result-delta");
const resultSub = document.getElementById("result-sub");
const resultList = document.getElementById("result-list");
const closeResultBtn = document.getElementById("close-result");

let examState = null;

document.querySelectorAll(".exam-btn").forEach((btn) => {
  btn.addEventListener("click", () => startExam(btn.dataset.level));
});

async function startExam(level) {
  try {
    const data = await store.startExam(currentNickname, level);
    examTitle.textContent = `${data.label} 시험`;
    examQuestions.innerHTML = "";
    data.problems.forEach((p) => {
      const div = document.createElement("div");
      div.className = "q";
      div.innerHTML = `
        <div class="q-label">문제 ${p.index + 1}</div>
        <div class="q-text">${escapeHtml(p.text)} = ?</div>
        <input type="number" inputmode="numeric" data-index="${p.index}" autocomplete="off" placeholder="정답" />`;
      examQuestions.appendChild(div);
    });
    examState = {
      sessionId: data.sessionId, count: data.count, timeLimit: data.timeLimit,
      deadline: Date.now() + data.timeLimit * 1000, tickHandle: null, submitting: false,
    };
    examOverlay.hidden = false;
    const first = examQuestions.querySelector("input");
    if (first) first.focus();
    startTimer();
  } catch (err) { alert(err.message); }
}

function startTimer() { updateTimer(); examState.tickHandle = setInterval(updateTimer, 250); }
function updateTimer() {
  if (!examState) return;
  const remainMs = Math.max(0, examState.deadline - Date.now());
  const remainSec = Math.ceil(remainMs / 1000);
  const mm = String(Math.floor(remainSec / 60)).padStart(2, "0");
  const ss = String(remainSec % 60).padStart(2, "0");
  examTimer.textContent = `${mm}:${ss}`;
  const ratio = remainMs / (examState.timeLimit * 1000);
  timerFill.style.width = `${ratio * 100}%`;
  const warn = remainSec <= 10;
  examTimer.classList.toggle("warn", warn);
  timerFill.classList.toggle("warn", warn);
  if (remainMs <= 0) finishExam(true);
}

async function finishExam(auto = false) {
  if (!examState || examState.submitting) return;
  examState.submitting = true;
  clearInterval(examState.tickHandle);
  const answers = new Array(examState.count).fill(null);
  examQuestions.querySelectorAll("input").forEach((inp) => {
    const idx = Number(inp.dataset.index);
    const v = inp.value.trim();
    answers[idx] = v === "" ? null : Number(v);
  });
  const sessionId = examState.sessionId;
  examOverlay.hidden = true;
  try {
    const res = await store.submitExam(sessionId, answers);
    showStats(res.player); loadBoard(); showResult(res, auto);
  } catch (err) { alert(err.message); }
  finally { examState = null; }
}

function showResult(res, auto) {
  const plus = res.wrongCount === 0;
  resultDelta.textContent = (res.scoreDelta >= 0 ? "+" : "") + res.scoreDelta;
  resultDelta.className = "result-delta " + (plus ? "plus" : "minus");
  let sub = `정답 ${res.correctCount} / ${res.results.length}`;
  if (res.timedOut) sub = "⏱ 시간 초과 — " + sub;
  else if (auto) sub = "자동 제출 — " + sub;
  resultSub.textContent = sub;
  resultList.innerHTML = "";
  res.results.forEach((r) => {
    const row = document.createElement("div");
    row.className = "result-row";
    row.innerHTML = `<span>문제 ${r.index + 1}</span>
      <span class="mark ${r.correct ? "ok" : "no"}">${r.correct ? "정답" : `오답 (${r.correctAnswer})`}</span>`;
    resultList.appendChild(row);
  });
  resultOverlay.hidden = false;
}

examSubmitBtn.addEventListener("click", () => finishExam(false));
examCancelBtn.addEventListener("click", () => {
  if (confirm("포기하면 지금까지 입력한 답안으로 채점돼요. 계속할까요?")) finishExam(false);
});
closeResultBtn.addEventListener("click", () => { resultOverlay.hidden = true; });

// ─── 운동: 종목 서브탭 ───
const sportAimPanel = document.getElementById("sport-aim");
const sportPkPanel = document.getElementById("sport-pk");
document.querySelectorAll(".sport-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    const sport = btn.dataset.sport;
    document.querySelectorAll(".sport-tab").forEach((b) => b.classList.toggle("active", b === btn));
    sportAimPanel.hidden = sport !== "aim";
    sportPkPanel.hidden = sport !== "pk";
    resetAim();
    resetPk();
  });
});

function resetSports() { resetAim(); resetPk(); }

// ─── 사격 (점수 차등 + 타격감) ───
const AIM_DURATION = 30; // 초
const aimStage = document.getElementById("aim-stage");
const aimTimeLabel = document.getElementById("aim-time");
const aimScoreLabel = document.getElementById("aim-score");
const aimCenter = document.getElementById("aim-center");
const aimCenterText = document.getElementById("aim-center-text");
const aimStartBtn = document.getElementById("aim-start");

let aimGame = null;

// 크기 → 점수: 작을수록 고득점 (1~5점). 크기는 점수별로 정함.
const AIM_TIERS = [
  { pts: 5, size: 26, color: "#e8697d" }, // 가장 작고 빨강 = 5점
  { pts: 4, size: 34, color: "#f0864a" },
  { pts: 3, size: 44, color: "#f0c674" },
  { pts: 2, size: 56, color: "#7fd0f0" },
  { pts: 1, size: 70, color: "#5ed3a3" }, // 가장 크고 초록 = 1점
];

function resetAim() {
  if (aimGame?.tickHandle) clearInterval(aimGame.tickHandle);
  aimGame = null;
  removeTarget();
  aimTimeLabel.textContent = AIM_DURATION;
  aimScoreLabel.textContent = 0;
  aimCenter.hidden = false;
  aimCenterText.textContent = "READY";
  aimStartBtn.hidden = false;
  aimStartBtn.textContent = "시작";
}

function removeTarget() {
  aimStage.querySelectorAll(".target:not(.hit-pop)").forEach((t) => t.remove());
}

function spawnTarget() {
  removeTarget();
  const tier = AIM_TIERS[Math.floor(Math.random() * AIM_TIERS.length)];
  const size = tier.size;
  const margin = size / 2 + 6;
  const w = aimStage.clientWidth, h = aimStage.clientHeight;
  const x = margin + Math.random() * (w - margin * 2);
  const y = margin + Math.random() * (h - margin * 2);
  const t = document.createElement("div");
  t.className = "target";
  t.style.width = t.style.height = `${size}px`;
  t.style.left = `${x}px`;
  t.style.top = `${y}px`;
  t.style.background = `radial-gradient(circle at 35% 35%, #fff6, ${tier.color})`;
  t.style.boxShadow = `0 0 12px ${tier.color}99`;
  t.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    if (!aimGame?.running) return;
    aimGame.score += tier.pts;
    aimScoreLabel.textContent = aimGame.score;
    hitEffect(x, y, tier);
    spawnTarget();
  });
  aimStage.appendChild(t);
}

// 타격감: 과녁 팝 + 점수 플로팅
function hitEffect(x, y, tier) {
  const pop = document.createElement("div");
  pop.className = "target hit-pop";
  pop.style.width = pop.style.height = `${tier.size}px`;
  pop.style.left = `${x}px`; pop.style.top = `${y}px`;
  pop.style.background = `radial-gradient(circle at 35% 35%, #fff, ${tier.color})`;
  aimStage.appendChild(pop);
  setTimeout(() => pop.remove(), 200);

  const float = document.createElement("div");
  float.className = "score-float";
  float.textContent = `+${tier.pts}`;
  float.style.left = `${x}px`; float.style.top = `${y}px`;
  float.style.color = tier.color;
  aimStage.appendChild(float);
  setTimeout(() => float.remove(), 700);
}

function startAim() {
  aimGame = { score: 0, timeLeft: AIM_DURATION, tickHandle: null, running: true };
  aimScoreLabel.textContent = 0;
  aimTimeLabel.textContent = AIM_DURATION;
  aimCenter.hidden = true;
  spawnTarget();
  aimGame.tickHandle = setInterval(() => {
    aimGame.timeLeft--;
    aimTimeLabel.textContent = aimGame.timeLeft;
    if (aimGame.timeLeft <= 0) endAim();
  }, 1000);
}

async function endAim() {
  if (!aimGame) return;
  clearInterval(aimGame.tickHandle);
  aimGame.running = false;
  removeTarget();
  const score = aimGame.score;
  aimCenter.hidden = false;
  aimCenterText.textContent = `${score} 점`;
  aimStartBtn.hidden = false;
  aimStartBtn.textContent = "다시";
  try {
    const { player } = await store.submitSportScore(currentNickname, "aim", score);
    showStats(player); loadBoard();
  } catch (err) { alert(err.message); }
  aimGame = null;
}

aimStartBtn.addEventListener("click", startAim);

// ─── 패널티킥 ───
const PK_TOTAL_KICKS = 5;
const PK_GOAL_POINTS = 20;
const pkField = document.getElementById("pk-field");
const pkKeeper = document.getElementById("pk-keeper");
const pkBall = document.getElementById("pk-ball");
const pkZones = document.getElementById("pk-zones");
const pkKickLabel = document.getElementById("pk-kick");
const pkGoalsLabel = document.getElementById("pk-goals");
const pkFill = document.getElementById("power-fill");
const pkSweet = document.getElementById("power-sweet");
const pkMsg = document.getElementById("pk-msg");
const pkAction = document.getElementById("pk-action");

// 5개 존의 중앙 x 좌표(%) — 키퍼/공 이동용
const ZONE_X = [14, 30, 45.5, 61, 77];
// 파워 sweet spot 구간(%) — 이 안에서 멈춰야 유효슛
const SWEET_MIN = 55, SWEET_MAX = 80;

let pkGame = null;
// state: "idle" | "aiming"(방향선택 대기) | "power"(게이지 움직임) | "resolving"

function resetPk() {
  if (pkGame?.powerHandle) cancelAnimationFrame(pkGame.powerHandle);
  pkGame = null;
  pkKickLabel.textContent = 0;
  pkGoalsLabel.textContent = 0;
  pkFill.style.width = "0%";
  pkMsg.textContent = "";
  pkMsg.className = "pk-msg";
  pkKeeper.style.left = "43.5%";
  pkKeeper.style.top = "30%";
  pkBall.style.left = "45.5%";
  pkBall.style.bottom = "6%";
  pkBall.style.transform = "none";
  clearZoneHighlight();
  pkAction.textContent = "시작";
  pkAction.disabled = false;
  // sweet spot 표시
  pkSweet.style.left = `${SWEET_MIN}%`;
  pkSweet.style.width = `${SWEET_MAX - SWEET_MIN}%`;
}

function clearZoneHighlight() {
  pkZones.querySelectorAll(".pk-zone").forEach((z) => z.classList.remove("chosen"));
}

function startPk() {
  pkGame = { kick: 0, goals: 0, score: 0, phase: "aiming", chosenZone: null, power: 0, powerDir: 1, powerHandle: null };
  pkKickLabel.textContent = 0;
  pkGoalsLabel.textContent = 0;
  pkMsg.textContent = "방향을 선택하세요";
  pkMsg.className = "pk-msg";
  pkAction.textContent = "방향 먼저 선택";
  pkAction.disabled = true;
  resetBallKeeper();
}

function resetBallKeeper() {
  pkKeeper.style.left = "43.5%";
  pkKeeper.style.top = "30%";
  pkBall.style.left = "45.5%";
  pkBall.style.bottom = "6%";
  pkBall.style.transform = "none";
}

// 방향 존 클릭 → 파워 게이지 시작
pkZones.querySelectorAll(".pk-zone").forEach((zone) => {
  zone.addEventListener("click", () => {
    if (!pkGame || pkGame.phase !== "aiming") return;
    pkGame.chosenZone = Number(zone.dataset.zone);
    clearZoneHighlight();
    zone.classList.add("chosen");
    startPowerGauge();
  });
});

function startPowerGauge() {
  pkGame.phase = "power";
  pkGame.power = 0;
  pkGame.powerDir = 1;
  pkMsg.textContent = "파워! 초록 구간에서 멈추세요";
  pkAction.textContent = "슛!";
  pkAction.disabled = false;

  const step = () => {
    if (!pkGame || pkGame.phase !== "power") return;
    pkGame.power += pkGame.powerDir * 1.8;
    if (pkGame.power >= 100) { pkGame.power = 100; pkGame.powerDir = -1; }
    if (pkGame.power <= 0) { pkGame.power = 0; pkGame.powerDir = 1; }
    pkFill.style.width = `${pkGame.power}%`;
    pkGame.powerHandle = requestAnimationFrame(step);
  };
  step();
}

async function shoot() {
  if (!pkGame || pkGame.phase !== "power") return;
  pkGame.phase = "resolving";
  cancelAnimationFrame(pkGame.powerHandle);
  pkAction.disabled = true;

  const power = pkGame.power;
  const zone = pkGame.chosenZone;

  // 키퍼는 랜덤 존으로 다이빙
  const keeperZone = Math.floor(Math.random() * 5);
  pkKeeper.style.left = `${ZONE_X[keeperZone] - 6.5}%`;
  pkKeeper.style.top = keeperZone === 2 ? "30%" : "34%";

  // 공은 선택 방향으로
  pkBall.style.left = `${ZONE_X[zone] - 4.5}%`;
  pkBall.style.bottom = "44%";
  pkBall.style.transform = "scale(.7)";

  // 판정: 파워가 sweet 안 + 키퍼가 다른 존 → 골
  const powerOk = power >= SWEET_MIN && power <= SWEET_MAX;
  const dodgedKeeper = keeperZone !== zone;
  const goal = powerOk && dodgedKeeper;

  await wait(380);

  pkGame.kick++;
  pkKickLabel.textContent = pkGame.kick;
  if (goal) {
    pkGame.goals++;
    pkGame.score += PK_GOAL_POINTS;
    pkGoalsLabel.textContent = pkGame.goals;
    pkMsg.textContent = "⚽ 골!";
    pkMsg.className = "pk-msg goal";
  } else {
    let reason = !powerOk
      ? (power < SWEET_MIN ? "파워 부족 — 빗나감" : "너무 셌음 — 빗나감")
      : "키퍼가 막았다!";
    pkMsg.textContent = `✖ ${reason}`;
    pkMsg.className = "pk-msg miss";
  }

  await wait(700);

  if (pkGame.kick >= PK_TOTAL_KICKS) {
    endPk();
  } else {
    pkFill.style.width = "0%";
    clearZoneHighlight();
    resetBallKeeper();
    pkGame.phase = "aiming";
    pkGame.chosenZone = null;
    pkMsg.textContent = "다음 킥 — 방향을 선택하세요";
    pkMsg.className = "pk-msg";
    pkAction.textContent = "방향 먼저 선택";
    pkAction.disabled = true;
  }
}

async function endPk() {
  const score = pkGame.score;
  const goals = pkGame.goals;
  pkMsg.textContent = `${goals}골 · ${score}점!`;
  pkMsg.className = "pk-msg goal";
  pkAction.textContent = "다시";
  pkAction.disabled = false;
  pkGame.phase = "done";
  try {
    const { player } = await store.submitSportScore(currentNickname, "pk", score);
    showStats(player); loadBoard();
  } catch (err) { alert(err.message); }
}

// 액션 버튼: 상태에 따라 시작/슛/다시
pkAction.addEventListener("click", () => {
  if (!pkGame || pkGame.phase === "done") { startPk(); return; }
  if (pkGame.phase === "power") { shoot(); return; }
});

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ─── 로그아웃 ───
logoutBtn.addEventListener("click", () => {
  store.clearSession();
  resetSports();
  currentNickname = null; currentProblemId = null;
  gameView.hidden = true; loginView.hidden = false;
  nicknameInput.value = ""; nicknameInput.focus();
});

// ─── 세션 복원 ───
(async function restore() {
  const saved = store.loadSession();
  if (!saved) return;
  try {
    const { player } = await store.getStats(saved);
    await enterGame(player);
  } catch { store.clearSession(); }
})();