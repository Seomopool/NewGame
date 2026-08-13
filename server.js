require("dotenv").config();
const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { Redis } = require("@upstash/redis");

const app = express();
app.use(express.json());
app.use(express.static("public"));

// ─── 저장 계층 (Storage Layer) ──────────────────────────────
// Upstash Redis(REST 기반)가 설정되어 있으면 그걸 쓰고, 아니면 로컬 JSON 파일로
// 폴백한다. 서버가 재시작/재배포돼도 Redis에 있으면 데이터가 사라지지 않는다.
// 이 함수들의 시그니처만 지키면 나머지 코드는 하나도 안 건드려도 됨.
const DB_PATH = path.join(__dirname, "db.json");
const DB_KEY = "projectlife:db";

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

if (!redis) {
  console.warn("[storage] UPSTASH_REDIS_REST_URL/TOKEN not set — falling back to local db.json (lost on restart).");
}

// Redis로 처음 전환하는 순간, 기존 db.json에 있던 데이터를 한 번만 그대로 옮겨준다.
async function readLocalDBFile() {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

async function readDB() {
  if (redis) {
    const data = await redis.get(DB_KEY);
    if (data) return data;

    const legacy = await readLocalDBFile();
    if (legacy) {
      await redis.set(DB_KEY, legacy);
      console.log("[storage] Migrated existing db.json into Redis.");
      return legacy;
    }
    return { players: {} };
  }
  return (await readLocalDBFile()) || { players: {} };
}

async function writeDB(db) {
  if (redis) {
    await redis.set(DB_KEY, db);
    return;
  }
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
const EXAM_CONFIGS = {
  math: {
    easy:   { label: "초급", count: 5, timeLimit: 60, reward: 500 },
    medium: { label: "중급", count: 5, timeLimit: 60, reward: 500 },
    hard:   { label: "고급", count: 5, timeLimit: 60, reward: 500 },
  },
  english: {
    easy:   { label: "TOEIC 초급", count: 5, timeLimit: 60, reward: 500 },
    medium: { label: "TOEIC 중급", count: 5, timeLimit: 60, reward: 500 },
    hard:   { label: "TOEIC 고급", count: 5, timeLimit: 60, reward: 500 },
  },
};
const PENALTY_PER_WRONG = 100; // 틀린 개수 × 100 (모든 난이도 공통)

// 진행 중인 시험 세션. sessionId -> { nickname, subject, level, meta[], startAt, deadline, submitted }
// meta[i] = { answer, type: "num"|"mc", choices? } — 채점과 결과 표시에 필요한 정보를 보관한다.
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
// ────────────────────────────────────────────────────────────

// ─── 영어(English) 문제: TOEIC 난이도 3단계, 4지선다 ────────────
// answer는 choices 배열의 정답 인덱스(0-based). 수학과 동일하게 정답은
// 클라이언트로 안 보내고, 채점도 "제출한 인덱스 === answer" 로 동일하게 처리한다.
const ENGLISH_QUESTIONS = {
  // 초급 — TOEIC 300~500: 기본 문법/전치사/시제
  easy: [
    { text: "Please ___ the door before you leave the office.", choices: ["close", "closes", "closing", "closed"], answer: 0 },
    { text: "She ___ to work by bus every day.", choices: ["go", "goes", "going", "gone"], answer: 1 },
    { text: "The report was finished ___ Friday afternoon.", choices: ["in", "on", "at", "for"], answer: 1 },
    { text: "There ___ many emails in my inbox this morning.", choices: ["is", "are", "was", "be"], answer: 1 },
    { text: "He is responsible ___ managing the sales team.", choices: ["of", "for", "with", "at"], answer: 1 },
    { text: "The new employees ___ orientation training last week.", choices: ["attend", "attends", "attended", "attending"], answer: 2 },
    { text: "Please send the invoice ___ me by email.", choices: ["to", "for", "at", "in"], answer: 0 },
    { text: "The conference room is ___ the third floor.", choices: ["in", "on", "at", "by"], answer: 1 },
    { text: "We need ___ more staff for the project.", choices: ["hire", "hires", "to hire", "hiring"], answer: 2 },
    { text: "The company ___ its profits last year.", choices: ["increase", "increases", "increased", "increasing"], answer: 2 },
    { text: "I will call you ___ I arrive at the airport.", choices: ["when", "what", "who", "which"], answer: 0 },
    { text: "The document must be signed ___ both parties.", choices: ["by", "from", "with", "of"], answer: 0 },
    { text: "Our office ___ closed on public holidays.", choices: ["is", "are", "be", "being"], answer: 0 },
    { text: "She works ___ a marketing manager.", choices: ["like", "as", "for", "to"], answer: 1 },
    { text: "The package will arrive ___ two days.", choices: ["at", "on", "in", "since"], answer: 2 },
  ],
  // 중급 — TOEIC 500~700: 수 일치, 관계절, 시제 조합, 비즈니스 어휘
  medium: [
    { text: "Each of the employees ___ required to submit a report.", choices: ["is", "are", "were", "have"], answer: 0 },
    { text: "The manager, along with his team, ___ attending the seminar.", choices: ["is", "are", "were", "have"], answer: 0 },
    { text: "The proposal, ___ was submitted last week, has been approved.", choices: ["who", "which", "whose", "when"], answer: 1 },
    { text: "Neither the director nor the employees ___ satisfied with the result.", choices: ["was", "is", "were", "has"], answer: 2 },
    { text: "The new policy will take effect ___ the beginning of next month.", choices: ["in", "at", "on", "by"], answer: 1 },
    { text: "Despite the ___ deadline, the team completed the project on time.", choices: ["tight", "tightly", "tightness", "tighten"], answer: 0 },
    { text: "The company's revenue has grown ___ over the past five years.", choices: ["steady", "steadily", "steadiness", "steadier"], answer: 1 },
    { text: "It is essential that every employee ___ the safety guidelines.", choices: ["follow", "follows", "followed", "following"], answer: 0 },
    { text: "The candidate whom we interviewed yesterday ___ highly qualified.", choices: ["seem", "seems", "seeming", "seemed"], answer: 1 },
    { text: "By the time the shipment arrives, the client ___ already left.", choices: ["will have", "has", "had", "would"], answer: 0 },
    { text: "The budget report must be reviewed ___ the finance team before submission.", choices: ["by", "from", "with", "at"], answer: 0 },
    { text: "Had we known about the delay, we ___ rescheduled the meeting.", choices: ["would", "would have", "will", "will have"], answer: 1 },
    { text: "The workshop is designed ___ improve communication skills.", choices: ["for", "to", "of", "at"], answer: 1 },
    { text: "Sales figures indicate that demand ___ increasing steadily.", choices: ["is", "are", "was", "were"], answer: 0 },
    { text: "The contract will not be valid ___ it is signed by both parties.", choices: ["unless", "because", "although", "so"], answer: 0 },
  ],
  // 고급 — TOEIC 700~900+: 도치, 관용 표현, 고급 비즈니스 어휘
  hard: [
    { text: "The board members were reluctant to approve the budget, ___ the CFO's strong recommendation.", choices: ["despite", "because", "therefore", "unless"], answer: 0 },
    { text: "Had the merger not been finalized, the two companies ___ as competitors.", choices: ["would remain", "would have remained", "remained", "will remain"], answer: 1 },
    { text: "The consultant's report ___ several inefficiencies that had gone unnoticed for years.", choices: ["revealed", "was revealed", "revealing", "reveal"], answer: 0 },
    { text: "Not only ___ the deadline missed, but the budget was also exceeded.", choices: ["was", "did", "has", "is"], answer: 0 },
    { text: "The CEO's decision to expand overseas proved more ___ than anticipated.", choices: ["cost", "costly", "costing", "costs"], answer: 1 },
    { text: "The merger negotiations, which had been ongoing for months, finally ___ fruition.", choices: ["came to", "came into", "came at", "came for"], answer: 0 },
    { text: "The committee's recommendation was met with considerable ___, given its controversial nature.", choices: ["skeptic", "skepticism", "skeptical", "skeptically"], answer: 1 },
    { text: "The firm's quarterly earnings fell short of analysts' expectations, ___ a decline in stock price.", choices: ["prompted", "prompting", "prompt", "prompts"], answer: 1 },
    { text: "Rarely ___ such a comprehensive analysis been conducted in this industry.", choices: ["has", "have", "had", "did"], answer: 0 },
    { text: "The new regulations, stringent ___ they are, have significantly reduced workplace accidents.", choices: ["as", "that", "though", "which"], answer: 0 },
    { text: "The proposal was rejected on the grounds ___ it lacked sufficient financial backing.", choices: ["that", "which", "of", "for"], answer: 0 },
    { text: "The executive team is expected to announce a restructuring plan ___ the coming weeks.", choices: ["within", "among", "between", "throughout"], answer: 0 },
    { text: "The audit revealed discrepancies that management had previously ___ down.", choices: ["play", "played", "playing", "plays"], answer: 1 },
    { text: "So ___ was the client with the service that she requested a formal apology.", choices: ["dissatisfied", "dissatisfy", "dissatisfaction", "dissatisfying"], answer: 0 },
    { text: "The vendor's failure to deliver on time constituted a clear breach ___ contract.", choices: ["of", "in", "with", "for"], answer: 0 },
  ],
};

function makeEnglishProblem(level) {
  const bank = ENGLISH_QUESTIONS[level] || ENGLISH_QUESTIONS.easy;
  const q = pick(bank);
  return { text: q.text, choices: q.choices, answer: q.answer };
}
// ────────────────────────────────────────────────────────────

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

// ─── 연습문제 발급 (수학/영어 공용) ───────────────────────────
// subject: "math"(기본) | "english". 영어는 4지선다라 choices도 함께 내려준다.
app.get("/api/problem", (req, res) => {
  const subject = req.query.subject === "english" ? "english" : "math";
  const problemId = crypto.randomUUID();

  if (subject === "english") {
    const { text, choices, answer } = makeEnglishProblem("easy");
    activeProblems.set(problemId, { type: "mc", choices, answer, expires: Date.now() + PROBLEM_TTL });
    return res.json({ problemId, text, type: "mc", choices }); // answer는 안 보냄
  }

  const { text, answer } = makeProblem();
  activeProblems.set(problemId, { type: "num", answer, expires: Date.now() + PROBLEM_TTL });
  res.json({ problemId, text, type: "num" });
});

// ─── 연습문제 채점 (서버 판정, 수학/영어 공용) ─────────────────
// answer 필드는 수학이면 입력한 숫자, 영어면 선택한 보기 인덱스 — 둘 다 숫자라 비교 로직은 동일하다.
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
    correctAnswerText: problem.type === "mc" ? problem.choices[problem.answer] : undefined,
    player,
  });
});

// ─── 시험 시작: 문제 세트 발급 + 서버가 시작시각/마감시각 기록 ──
// subject: "math"(기본) | "english". 문제 타입(num/mc)은 subject로 결정된다.
app.post("/api/exam/start", async (req, res) => {
  const nickname = (req.body?.nickname || "").trim();
  const level = req.body?.level;
  const subject = req.body?.subject === "english" ? "english" : "math";
  const configs = EXAM_CONFIGS[subject];
  if (!nickname) return res.status(400).json({ error: "닉네임이 필요해요." });
  if (!configs[level]) return res.status(400).json({ error: "잘못된 난이도." });

  const db = await readDB();
  const key = nickname.toLowerCase();
  if (!db.players[key]) return res.status(404).json({ error: "없는 플레이어." });

  const cfg = configs[level];
  const problems = [];
  const meta = [];
  for (let i = 0; i < cfg.count; i++) {
    if (subject === "english") {
      const q = makeEnglishProblem(level);
      problems.push({ index: i, text: q.text, type: "mc", choices: q.choices }); // 정답은 안 보냄
      meta.push({ type: "mc", answer: q.answer, choices: q.choices });
    } else {
      const p = makeExamProblem(level);
      problems.push({ index: i, text: p.text, type: "num" });
      meta.push({ type: "num", answer: p.answer });
    }
  }

  const sessionId = crypto.randomUUID();
  const startAt = Date.now();
  const deadline = startAt + cfg.timeLimit * 1000;
  examSessions.set(sessionId, {
    nickname, subject, level, meta, startAt, deadline, submitted: false,
  });

  res.json({
    sessionId,
    subject,
    level,
    label: cfg.label,
    count: cfg.count,
    timeLimit: cfg.timeLimit, // 초
    reward: cfg.reward,
    problems,                 // [{index, text, type, choices?}]
  });
});

// ─── 시험 제출: 서버가 채점 + 시간초과 판정 + 점수 반영 ────────
// 수학은 입력한 숫자, 영어는 선택한 보기 인덱스 — 둘 다 숫자 비교라 채점 로직은 공용이다.
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
  const cfg = EXAM_CONFIGS[session.subject][session.level];
  // 서버 기준 시간초과 (약간의 네트워크 여유 2초)
  const timedOut = now > session.deadline + 2000;

  // 채점: 시간초과면 전부 오답 처리
  const results = session.meta.map((m, i) => {
    const given = submitted[i];
    const isCorrect = !timedOut &&
      given !== null && given !== undefined &&
      Number(given) === m.answer;
    return {
      index: i,
      correct: isCorrect,
      correctAnswer: m.answer,
      correctAnswerText: m.type === "mc" ? m.choices[m.answer] : undefined,
    };
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