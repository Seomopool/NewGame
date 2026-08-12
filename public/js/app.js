// app.js
import { store } from "./store.js";

// ─ 로그인 화면 ─
const loginView = document.getElementById("login-view");
const gameView = document.getElementById("game-view");
const nicknameInput = document.getElementById("nickname-input");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");

// ─ 게임 화면: 스탯 ─
const nameLabel = document.getElementById("player-name");
const academicLabel = document.getElementById("stat-academic");
const solvedLabel = document.getElementById("stat-solved");
const attemptedLabel = document.getElementById("stat-attempted");
const logoutBtn = document.getElementById("logout-btn");

// ─ 문제 풀이 ─
const problemText = document.getElementById("problem-text");
const answerInput = document.getElementById("answer-input");
const submitBtn = document.getElementById("submit-btn");
const skipBtn = document.getElementById("skip-btn");
const feedback = document.getElementById("quiz-feedback");

// ─ 순위 ─
const boardBody = document.getElementById("board-body");
const refreshBtn = document.getElementById("refresh-btn");

let currentNickname = null;
let currentProblemId = null;

function showStats(player) {
  nameLabel.textContent = player.nickname;
  academicLabel.textContent = player.academic;
  solvedLabel.textContent = player.solved;
  attemptedLabel.textContent = player.attempted;
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
nicknameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doLogin(nicknameInput.value);
});

// ─── 문제 ───
async function loadProblem() {
  feedback.textContent = "";
  feedback.className = "feedback";
  answerInput.value = "";
  problemText.textContent = "…";
  try {
    const { problemId, text } = await store.getProblem();
    currentProblemId = problemId;
    problemText.textContent = text + " = ?";
    answerInput.focus();
  } catch (err) {
    problemText.textContent = "문제를 불러오지 못했어요";
  }
}

async function submitAnswer() {
  if (!currentProblemId) return;
  const val = answerInput.value.trim();
  if (val === "") return;

  submitBtn.disabled = true;
  try {
    const { correct, correctAnswer, player } = await store.submitAnswer(
      currentNickname, currentProblemId, Number(val)
    );
    showStats(player);
    if (correct) {
      feedback.textContent = "정답! +10";
      feedback.className = "feedback ok";
    } else {
      feedback.textContent = `오답 (정답: ${correctAnswer})  -5`;
      feedback.className = "feedback no";
    }
    currentProblemId = null;
    loadBoard();                       // 순위 갱신
    setTimeout(loadProblem, 900);      // 잠깐 결과 보여주고 다음 문제
  } catch (err) {
    feedback.textContent = err.message;
    feedback.className = "feedback no";
    if (err.message.includes("만료")) setTimeout(loadProblem, 600);
  } finally {
    submitBtn.disabled = false;
  }
}

submitBtn.addEventListener("click", submitAnswer);
answerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") submitAnswer();
});
skipBtn.addEventListener("click", loadProblem);

// ─── 순위 ───
function medal(rank) {
  return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;
}

async function loadBoard() {
  try {
    const { ranking } = await store.getLeaderboard();
    boardBody.innerHTML = "";
    for (const row of ranking) {
      const tr = document.createElement("tr");
      if (currentNickname &&
          row.nickname.toLowerCase() === currentNickname.toLowerCase()) {
        tr.className = "me";
      }
      tr.innerHTML = `
        <td class="rank-medal">${medal(row.rank)}</td>
        <td>${escapeHtml(row.nickname)}</td>
        <td class="r">${row.academic}</td>
        <td class="r">${row.solved}/${row.attempted}</td>`;
      boardBody.appendChild(tr);
    }
    if (ranking.length === 0) {
      boardBody.innerHTML =
        `<tr><td colspan="4" style="text-align:center;color:var(--muted)">아직 순위가 없어요</td></tr>`;
    }
  } catch {
    // 순위 실패는 조용히 무시 (게임엔 지장 없음)
  }
}
refreshBtn.addEventListener("click", loadBoard);

// 닉네임에 <, > 같은 게 들어와도 안전하게
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

// ─── 로그아웃 ───
logoutBtn.addEventListener("click", () => {
  store.clearSession();
  currentNickname = null;
  currentProblemId = null;
  gameView.hidden = true;
  loginView.hidden = false;
  nicknameInput.value = "";
  nicknameInput.focus();
});

// ─── 새로고침 시 세션 복원 ───
(async function restore() {
  const saved = store.loadSession();
  if (!saved) return;
  try {
    const { player } = await store.getStats(saved);
    await enterGame(player);
  } catch {
    store.clearSession();
  }
})();