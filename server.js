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
    athletic: 0,        // 운동 스탯
    solved: 0,          // 맞힌 문제 수
    attempted: 0,       // 시도한 문제 수
    aimBest: 0,         // 사격 최고 기록
    pkBest: 0,          // 패널티킥 최고 기록
    createdAt: Date.now(),
  };
}

// 예전 db.json에 없던 필드를 보정
function ensureFields(p) {
  if (p.academic === undefined) p.academic = 0;
  if (p.athletic === undefined) p.athletic = 0;
  if (p.solved === undefined) p.solved = 0;
  if (p.attempted === undefined) p.attempted = 0;
  if (p.aimBest === undefined) p.aimBest = 0;
  if (p.pkBest === undefined) p.pkBest = 0;
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

// ─── 시험(Exam): 난이도 3단계, 시간제한, 서버 판정 ──────────────
// 시험 설정
const EXAM_CONFIG = {
  easy:   { label: "초급", count: 5, timeLimit: 60, reward: 500 },
  medium: { label: "중급", count: 5, timeLimit: 60, reward: 500 },
  hard:   { label: "고급", count: 5, timeLimit: 60, reward: 500 },
};
const PENALTY_PER_WRONG = 100; // 틀린 개수 × 100 (모든 난이도 공통)

// 진행 중인 시험 세션. sessionId -> { nickname, level, answers[], startAt, deadline, submitted }
const examSessions = new Map();
const EXAM_SESSION_GRACE = 30 * 1000; // 제한시간 지나도 이만큼은 세션 보관(만료 판정용)

function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }
function lcm(a, b) { return (a * b) / gcd(a, b); }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function factorial(n) { let f = 1; for (let i = 2; i <= n; i++) f *= i; return f; }
function nPr(n, r) { let p = 1; for (let i = 0; i < r; i++) p *= (n - i); return p; }
function nCr(n, r) { return nPr(n, r) / factorial(r); }

// 난이도별 문제 1개 생성 → { text, answer }  (답은 항상 정수)
function makeExamProblem(level) {
  if (level === "easy") return makeEasyProblem();
  if (level === "medium") return makeMediumProblem();
  return makeHardProblem();
}

// ── 초급: 사칙연산 응용, 거듭제곱, 약수, 나머지 등 (10유형) ──
function makeEasyProblem() {
  const kind = randInt(0, 9);
  if (kind === 0) { // a + b - c
    const a = randInt(10, 60), b = randInt(10, 60), c = randInt(1, 40);
    return { text: `${a} + ${b} − ${c}`, answer: a + b - c };
  } else if (kind === 1) { // a × b + c
    const a = randInt(2, 12), b = randInt(2, 12), c = randInt(1, 50);
    return { text: `${a} × ${b} + ${c}`, answer: a * b + c };
  } else if (kind === 2) { // 거듭제곱
    const a = randInt(2, 9), n = randInt(2, 3);
    return { text: `${a}^${n}`, answer: a ** n };
  } else if (kind === 3) { // (a÷b)+c
    const b = randInt(2, 9), q = randInt(2, 9), c = randInt(1, 30);
    return { text: `${b * q} ÷ ${b} + ${c}`, answer: q + c };
  } else if (kind === 4) { // a × (b + c)
    const a = randInt(2, 9), b = randInt(2, 15), c = randInt(2, 15);
    return { text: `${a} × (${b} + ${c})`, answer: a * (b + c) };
  } else if (kind === 5) { // 나머지
    const b = randInt(3, 9), a = randInt(20, 99);
    return { text: `${a} 를 ${b} 로 나눈 나머지`, answer: a % b };
  } else if (kind === 6) { // 연속 덧셈 1+2+...+n
    const n = randInt(5, 15);
    return { text: `1 부터 ${n} 까지 자연수의 합`, answer: (n * (n + 1)) / 2 };
  } else if (kind === 7) { // 두 수의 곱
    const a = randInt(11, 25), b = randInt(3, 9);
    return { text: `${a} × ${b}`, answer: a * b };
  } else if (kind === 8) { // 절댓값 차
    const a = randInt(1, 50), b = randInt(1, 50);
    return { text: `|${a} − ${b}|`, answer: Math.abs(a - b) };
  } else { // 평균
    const nums = [randInt(2, 20), randInt(2, 20), randInt(2, 20)];
    const sum = nums.reduce((s, v) => s + v, 0);
    const avg = Math.round(sum / 3) * 3 === sum ? sum / 3 : null;
    if (avg === null) { // 정수 안 되면 곱셈으로 폴백
      const a = randInt(2, 12), b = randInt(2, 12);
      return { text: `${a} × ${b}`, answer: a * b };
    }
    return { text: `세 수 ${nums[0]}, ${nums[1]}, ${nums[2]} 의 평균`, answer: avg };
  }
}

// ── 중급: 방정식, 약수/배수, 비율, 제곱근, 수열 기초 (10유형) ──
function makeMediumProblem() {
  const kind = randInt(0, 9);
  if (kind === 0) { // ax + b = c
    const x = randInt(1, 20), a = randInt(2, 9), b = randInt(1, 30);
    return { text: `방정식 ${a}x + ${b} = ${a * x + b} 의 해 x`, answer: x };
  } else if (kind === 1) { // 최대공약수
    const g = randInt(2, 12), m = randInt(2, 9), n = randInt(2, 9);
    return { text: `${g * m} 와 ${g * n} 의 최대공약수`, answer: gcd(g * m, g * n) };
  } else if (kind === 2) { // 최소공배수
    const a = randInt(4, 15), b = randInt(4, 15);
    return { text: `${a} 와 ${b} 의 최소공배수`, answer: lcm(a, b) };
  } else if (kind === 3) { // 백분율
    const p = pick([10, 20, 25, 50]);
    const base = randInt(4, 40) * (100 / p);
    return { text: `${base} 의 ${p}%`, answer: (base * p) / 100 };
  } else if (kind === 4) { // 정수 제곱근
    const r = randInt(4, 20);
    return { text: `√${r * r}`, answer: r };
  } else if (kind === 5) { // ax - b = cx + d 꼴
    const x = randInt(1, 15), a = randInt(3, 9), c = randInt(1, 2);
    const b = randInt(1, 20), d = (a - c) * x - b;
    return { text: `방정식 ${a}x − ${b} = ${c}x + ${d} 의 해 x`, answer: x };
  } else if (kind === 6) { // 약수의 개수
    const primes = [2, 3, 5, 7];
    const p1 = pick(primes), p2 = pick(primes.filter(p => p !== p1));
    const e1 = randInt(1, 3), e2 = randInt(1, 2);
    const num = p1 ** e1 * p2 ** e2;
    return { text: `${num} 의 약수의 개수`, answer: (e1 + 1) * (e2 + 1) };
  } else if (kind === 7) { // 비례식 a:b = c:x
    const a = randInt(2, 8), k = randInt(2, 6);
    const b = randInt(2, 8), c = a * k;
    return { text: `비례식 ${a} : ${b} = ${c} : x 에서 x`, answer: b * k };
  } else if (kind === 8) { // 등차수열 항
    const a1 = randInt(1, 10), d = randInt(2, 6), n = randInt(4, 10);
    return { text: `첫째항 ${a1}, 공차 ${d} 인 등차수열의 제${n}항`, answer: a1 + (n - 1) * d };
  } else { // 일차식 대입
    const a = randInt(2, 6), b = randInt(1, 10), x = randInt(2, 8);
    return { text: `f(x)=${a}x+${b} 일 때 f(${x})`, answer: a * x + b };
  }
}

// ── 고급: 이차방정식, 수열, 경우의 수, 미적분(정수답) (12유형) ──
function makeHardProblem() {
  const kind = randInt(0, 11);
  if (kind === 0) { // 이차방정식 큰 근
    const p = randInt(1, 12), q = randInt(1, 12);
    return { text: `x² − ${p + q}x + ${p * q} = 0 의 두 근 중 큰 값`, answer: Math.max(p, q) };
  } else if (kind === 1) { // 등차수열 n항
    const a1 = randInt(1, 10), d = randInt(2, 6), n = randInt(5, 12);
    return { text: `첫째항 ${a1}, 공차 ${d} 인 등차수열의 제${n}항`, answer: a1 + (n - 1) * d };
  } else if (kind === 2) { // 순열
    const n = randInt(4, 6), r = randInt(2, 3);
    return { text: `${n}명 중 ${r}명을 뽑아 일렬로 세우는 경우의 수`, answer: nPr(n, r) };
  } else if (kind === 3) { // 조합
    const n = randInt(4, 8), r = randInt(2, 3);
    return { text: `서로 다른 ${n}개에서 ${r}개를 고르는 경우의 수`, answer: nCr(n, r) };
  } else if (kind === 4) { // 등비수열 n항
    const a1 = randInt(1, 4), r = randInt(2, 3), n = randInt(3, 5);
    return { text: `첫째항 ${a1}, 공비 ${r} 인 등비수열의 제${n}항`, answer: a1 * r ** (n - 1) };
  } else if (kind === 5) { // 두 근의 합/곱 (근과 계수)
    const p = randInt(1, 10), q = randInt(1, 10);
    if (randInt(0, 1)) return { text: `x² − ${p + q}x + ${p * q} = 0 의 두 근의 합`, answer: p + q };
    return { text: `x² − ${p + q}x + ${p * q} = 0 의 두 근의 곱`, answer: p * q };
  } else if (kind === 6) { // 다항함수 미분계수 f'(a)
    // f(x) = x² + bx + c,  f'(x) = 2x + b
    const b = randInt(1, 8), a = randInt(1, 6);
    return { text: `f(x)=x²+${b}x 일 때 미분계수 f′(${a})`, answer: 2 * a + b };
  } else if (kind === 7) { // 3차함수 미분계수
    // f(x)=x³,  f'(x)=3x²,  f'(a)=3a²
    const a = randInt(1, 5);
    return { text: `f(x)=x³ 일 때 미분계수 f′(${a})`, answer: 3 * a * a };
  } else if (kind === 8) { // 정적분 ∫₀ᵃ (2x) dx = a²
    const a = randInt(2, 6);
    return { text: `정적분 ∫₀^${a} 2x dx`, answer: a * a };
  } else if (kind === 9) { // 정적분 ∫₀ᵃ 3x² dx = a³
    const a = randInt(2, 4);
    return { text: `정적분 ∫₀^${a} 3x² dx`, answer: a ** 3 };
  } else if (kind === 10) { // 접선의 기울기 = f'(a)
    // f(x)=x², 점 x=a 에서 접선의 기울기 = 2a
    const a = randInt(1, 9);
    return { text: `곡선 y=x² 위의 점 x=${a} 에서 접선의 기울기`, answer: 2 * a };
  } else { // 극값을 갖는 x 좌표: f(x)=x²-2ax 의 최솟값 위치 x=a
    const a = randInt(1, 8);
    return { text: `f(x)=x²−${2 * a}x 가 최솟값을 갖는 x`, answer: a };
  }
}

// 만료된 시험 세션 청소
function cleanupExams() {
  const now = Date.now();
  for (const [id, s] of examSessions) {
    if (s.deadline + EXAM_SESSION_GRACE < now) examSessions.delete(id);
  }
}
setInterval(cleanupExams, 30 * 1000);
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
    player.academic -= 5; // 음수 허용
  }

  await writeDB(db);
  res.json({
    correct,
    correctAnswer: problem.answer, // 채점 끝났으니 이제 알려줘도 됨
    player,
  });
});

// ─── 시험 시작: 문제 세트 발급 + 서버가 시작시각/마감시각 기록 ──
app.post("/api/exam/start", async (req, res) => {
  const nickname = (req.body?.nickname || "").trim();
  const level = req.body?.level;
  if (!nickname) return res.status(400).json({ error: "닉네임이 필요해요." });
  if (!EXAM_CONFIG[level]) return res.status(400).json({ error: "잘못된 난이도." });

  const db = await readDB();
  const key = nickname.toLowerCase();
  if (!db.players[key]) return res.status(404).json({ error: "없는 플레이어." });

  const cfg = EXAM_CONFIG[level];
  const problems = [];
  const answers = [];
  for (let i = 0; i < cfg.count; i++) {
    const p = makeExamProblem(level);
    problems.push({ index: i, text: p.text }); // 정답은 안 보냄
    answers.push(p.answer);
  }

  const sessionId = crypto.randomUUID();
  const startAt = Date.now();
  const deadline = startAt + cfg.timeLimit * 1000;
  examSessions.set(sessionId, {
    nickname, level, answers, startAt, deadline, submitted: false,
  });

  res.json({
    sessionId,
    level,
    label: cfg.label,
    count: cfg.count,
    timeLimit: cfg.timeLimit, // 초
    reward: cfg.reward,
    problems,                 // [{index, text}]
  });
});

// ─── 시험 제출: 서버가 채점 + 시간초과 판정 + 점수 반영 ────────
app.post("/api/exam/submit", async (req, res) => {
  const sessionId = req.body?.sessionId;
  const submitted = req.body?.answers; // 배열: index별 제출값 (숫자 or null)

  const session = examSessions.get(sessionId);
  if (!session) return res.status(410).json({ error: "시험 세션이 만료됐거나 없어요." });
  if (session.submitted) {
    return res.status(409).json({ error: "이미 제출한 시험이에요." });
  }
  if (!Array.isArray(submitted)) {
    return res.status(400).json({ error: "답안 형식이 잘못됐어요." });
  }

  session.submitted = true; // 재제출 차단

  const now = Date.now();
  const cfg = EXAM_CONFIG[session.level];
  // 서버 기준 시간초과 (약간의 네트워크 여유 2초)
  const timedOut = now > session.deadline + 2000;

  // 채점: 시간초과면 전부 오답 처리
  const results = session.answers.map((correctAns, i) => {
    const given = submitted[i];
    const isCorrect = !timedOut &&
      given !== null && given !== undefined &&
      Number(given) === correctAns;
    return { index: i, correct: isCorrect, correctAnswer: correctAns };
  });

  const correctCount = results.filter((r) => r.correct).length;
  const wrongCount = cfg.count - correctCount;

  // 점수 규칙: 만점이면 reward, 하나라도 틀리면 (틀린 개수 × 100) 감점
  let scoreDelta;
  if (wrongCount === 0) {
    scoreDelta = cfg.reward;
  } else {
    scoreDelta = -(wrongCount * PENALTY_PER_WRONG);
  }

  // 점수 반영 (academic 0 하한)
  const db = await readDB();
  const key = session.nickname.toLowerCase();
  const player = db.players[key];
  if (!player) return res.status(404).json({ error: "없는 플레이어." });
  ensureFields(player);

  player.academic = player.academic + scoreDelta; // 음수 허용
  player.attempted += cfg.count;
  player.solved += correctCount;
  await writeDB(db);

  examSessions.delete(sessionId);

  res.json({
    timedOut,
    correctCount,
    wrongCount,
    scoreDelta,
    results,  // 각 문제 정답 공개 (채점 끝났으니 OK)
    player,
  });
});

// ─── 운동: 종목별 점수 반영 (클라이언트 점수 신뢰) ──────────────
// sport: "aim"(사격) | "pk"(패널티킥). 둘 다 athletic 스탯에 합산.
app.post("/api/sport/score", async (req, res) => {
  const nickname = (req.body?.nickname || "").trim();
  const sport = req.body?.sport;
  const score = Number(req.body?.score);

  if (!nickname || Number.isNaN(score)) {
    return res.status(400).json({ error: "잘못된 요청." });
  }
  if (!["aim", "pk"].includes(sport)) {
    return res.status(400).json({ error: "알 수 없는 종목." });
  }
  // 상식 밖 값 방어 (한 판에서 도달 불가능한 점수 컷)
  const MAX = sport === "aim" ? 100000 : 1000;
  if (score < 0 || score > MAX) {
    return res.status(400).json({ error: "점수 범위 오류." });
  }

  const db = await readDB();
  const key = nickname.toLowerCase();
  const player = db.players[key];
  if (!player) return res.status(404).json({ error: "없는 플레이어." });
  ensureFields(player);

  // 이번 판 점수를 athletic 스탯에 누적 가산
  player.athletic += score;
  // 종목별 최고 기록 갱신
  if (sport === "aim" && score > player.aimBest) player.aimBest = score;
  if (sport === "pk" && score > player.pkBest) player.pkBest = score;

  await writeDB(db);
  res.json({ player, gained: score });
});

// (구버전 호환) 기존 aim/score 엔드포인트 유지
app.post("/api/aim/score", async (req, res) => {
  req.body.sport = "aim";
  // 위 핸들러로 위임하지 않고 간단히 재구현
  const nickname = (req.body?.nickname || "").trim();
  const score = Number(req.body?.score);
  if (!nickname || Number.isNaN(score) || score < 0 || score > 100000) {
    return res.status(400).json({ error: "잘못된 요청." });
  }
  const db = await readDB();
  const key = nickname.toLowerCase();
  const player = db.players[key];
  if (!player) return res.status(404).json({ error: "없는 플레이어." });
  ensureFields(player);
  player.athletic += score;
  if (score > player.aimBest) player.aimBest = score;
  await writeDB(db);
  res.json({ player, gained: score });
});

// ─── 순위 대시보드: 학업 / 운동 / 총합 ───────────────────────
function buildRanking(players, keyFn) {
  return players
    .map(ensureFields)
    .sort((a, b) => keyFn(b) - keyFn(a))
    .slice(0, 20)
    .map((p, i) => ({
      rank: i + 1,
      nickname: p.nickname,
      academic: p.academic,
      athletic: p.athletic,
      total: p.academic + p.athletic,
      solved: p.solved,
      aimBest: p.aimBest,
    }));
}

app.get("/api/leaderboard", async (req, res) => {
  const board = (req.query.board || "total"); // academic | athletic | total
  const db = await readDB();
  const players = Object.values(db.players);

  let keyFn;
  if (board === "academic") keyFn = (p) => p.academic;
  else if (board === "athletic") keyFn = (p) => p.athletic;
  else keyFn = (p) => p.academic + p.athletic;

  res.json({ board, ranking: buildRanking(players, keyFn) });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});