// store.js
// 서버 API를 감싸는 얇은 계층.
// 화면 로직(app.js)은 fetch 세부사항을 몰라도 되게 여기서 다 처리.
// 나중에 서버 주소가 바뀌거나 인증이 붙어도 이 파일만 고치면 됨.

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `요청 실패 (${res.status})`);
  }
  return data;
}

export const store = {
  login(nickname) {
    return request("/api/login", {
      method: "POST",
      body: JSON.stringify({ nickname }),
    });
  },

  getStats(nickname) {
    return request(`/api/stats/${encodeURIComponent(nickname)}`);
  },

  // 새 수학문제 받기 (정답은 서버가 쥐고 있음)
  getProblem() {
    return request("/api/problem");
  },

  // 답 제출 → 서버가 채점
  submitAnswer(nickname, problemId, answer) {
    return request("/api/answer", {
      method: "POST",
      body: JSON.stringify({ nickname, problemId, answer }),
    });
  },

  // 순위표 (board: "academic" | "athletic" | "total")
  getLeaderboard(board = "total") {
    return request(`/api/leaderboard?board=${board}`);
  },

  // 운동: 종목별 점수 제출 (sport: "aim" | "pk")
  submitSportScore(nickname, sport, score) {
    return request("/api/sport/score", {
      method: "POST",
      body: JSON.stringify({ nickname, sport, score }),
    });
  },

  // 시험 시작 (난이도: "easy" | "medium" | "hard")
  startExam(nickname, level) {
    return request("/api/exam/start", {
      method: "POST",
      body: JSON.stringify({ nickname, level }),
    });
  },

  // 시험 제출 (answers: index별 숫자 배열, 안 푼 건 null)
  submitExam(sessionId, answers) {
    return request("/api/exam/submit", {
      method: "POST",
      body: JSON.stringify({ sessionId, answers }),
    });
  },

  // 새로고침해도 로그인 유지 (브라우저 로컬 저장)
  saveSession(nickname) {
    localStorage.setItem("nickname", nickname);
  },
  loadSession() {
    return localStorage.getItem("nickname");
  },
  clearSession() {
    localStorage.removeItem("nickname");
  },
};