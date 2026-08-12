const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(express.json());
app.use(express.static("public"));

// ─── 저장 계층 (Storage Layer) ──────────────────────────────
// 지금은 JSON 파일. 나중에 이 함수들만 DB 버전으로 바꾸면
// 나머지 코드는 하나도 안 건드려도 됨.
const DB_PATH = path.join(__dirname, "db.json");

async function readDB() {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return { players: {} };
    throw err;
  }
}

async function writeDB(db) {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

function newPlayer(nickname) {
  return {
    nickname,
    wins: 0,
    losses: 0,
    gamesPlayed: 0,
    academic: 0,        // 학업 스탯
    solved: 0,          // 맞힌 문제 수
    attempted: 0,       // 시도한 문제 수
    createdAt: Date.now(),
  };
}

// 예전 db.json에 academic 등이 없는 플레이어를 위한 보정
function ensureFields(p) {
  if (p.academic === undefined) p.academic = 0;
  if (p.solved === undefined) p.solved = 0;
  if (p.attempted === undefined) p.attempted = 0;
  return p;
}
// ────────────────────────────────────────────────────────────

// ─── 수학문제: 서버가 문제를 내고 정답을 보관 ────────────────
// 정답은 절대 클라이언트로 안 보냄. problemId만 발급.
// 메모리 저장이라 서버 재시작 시 진행 중 문제는 사라짐(허용).
const activeProblems = new Map(); // problemId -> { answer, expires }
const PROBLEM_TTL = 60 * 1000;    // 문제 유효시간 60초

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeProblem() {
  const ops = ["+", "-", "×", "÷"];
  const op = ops[randInt(0, 3)];
  let a, b, answer, text;

  if (op === "+") {
    a = randInt(1, 99); b = randInt(1, 99);
    answer = a + b; text = `${a} + ${b}`;
  } else if (op === "-") {
    a = randInt(1, 99); b = randInt(1, a); // 음수 안 나오게
    answer = a - b; text = `${a} - ${b}`;
  } else if (op === "×") {
    a = randInt(2, 12); b = randInt(2, 12);
    answer = a * b; text = `${a} × ${b}`;
  } else { // ÷  나누어떨어지게
    b = randInt(2, 12); answer = randInt(2, 12);
    a = b * answer; text = `${a} ÷ ${b}`;
  }
  return { text, answer };
}

// 만료된 문제 청소 (메모리 누수 방지)
function cleanupProblems() {
  const now = Date.now();
  for (const [id, p] of activeProblems) {
    if (p.expires < now) activeProblems.delete(id);
  }
}
setInterval(cleanupProblems, 30 * 1000);
// ────────────────────────────────────────────────────────────

// 로그인: 닉네임만.
app.post("/api/login", async (req, res) => {
  const nickname = (req.body?.nickname || "").trim();
  if (!nickname) return res.status(400).json({ error: "닉네임을 입력하세요." });
  if (nickname.length > 20) return res.status(400).json({ error: "닉네임은 20자 이하로." });

  const db = await readDB();
  const key = nickname.toLowerCase();

  if (!db.players[key]) {
    db.players[key] = newPlayer(nickname);
    await writeDB(db);
  } else {
    ensureFields(db.players[key]);
    await writeDB(db);
  }
  res.json({ player: db.players[key] });
});

// 스탯 조회
app.get("/api/stats/:nickname", async (req, res) => {
  const key = req.params.nickname.toLowerCase();
  const db = await readDB();
  const player = db.players[key];
  if (!player) return res.status(404).json({ error: "없는 플레이어." });
  res.json({ player: ensureFields(player) });
});

// ─── 수학문제 발급 ───────────────────────────────────────────
app.get("/api/problem", (req, res) => {
  const { text, answer } = makeProblem();
  const problemId = crypto.randomUUID();
  activeProblems.set(problemId, { answer, expires: Date.now() + PROBLEM_TTL });
  res.json({ problemId, text }); // answer는 안 보냄
});

// ─── 수학문제 채점 (서버 판정) ───────────────────────────────
app.post("/api/answer", async (req, res) => {
  const nickname = (req.body?.nickname || "").trim();
  const problemId = req.body?.problemId;
  const submitted = Number(req.body?.answer);

  if (!nickname || !problemId || Number.isNaN(submitted)) {
    return res.status(400).json({ error: "잘못된 요청." });
  }

  const problem = activeProblems.get(problemId);
  if (!problem) {
    return res.status(410).json({ error: "문제가 만료됐어요. 새 문제를 받으세요." });
  }
  // 한 번 제출하면 그 문제는 소멸 (중복 제출·재시도 방지)
  activeProblems.delete(problemId);

  const db = await readDB();
  const key = nickname.toLowerCase();
  const player = db.players[key];
  if (!player) return res.status(404).json({ error: "없는 플레이어." });
  ensureFields(player);

  const correct = submitted === problem.answer;
  player.attempted++;
  if (correct) {
    player.academic += 10;
    player.solved++;
  } else {
    player.academic = Math.max(0, player.academic - 5); // 0 밑으론 안 내려감
  }

  await writeDB(db);
  res.json({
    correct,
    correctAnswer: problem.answer, // 채점 끝났으니 이제 알려줘도 됨
    player,
  });
});

// ─── 순위 대시보드 (학업 스탯 기준) ──────────────────────────
app.get("/api/leaderboard", async (req, res) => {
  const db = await readDB();
  const ranking = Object.values(db.players)
    .map(ensureFields)
    .sort((a, b) => b.academic - a.academic)
    .slice(0, 20)
    .map((p, i) => ({
      rank: i + 1,
      nickname: p.nickname,
      academic: p.academic,
      solved: p.solved,
      attempted: p.attempted,
    }));
  res.json({ ranking });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});