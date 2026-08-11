// DOM rendering — kept separate from game.js so game logic stays UI-agnostic.

// Ch.4.5: 히든 스탯은 UI에 절대 노출하지 않는다.
const HIDDEN_STAT_KEYS = new Set(["karma", "morality", "reputation", "fame", "trauma", "luck"]);

const STAT_ICON = {
    health: "❤️", intelligence: "🧠", charm: "✨", creativity: "🎨", mental: "🧘",
    stress: "⚡", happiness: "😊", wealth: "💰",
    extroversion: "🗣️", empathy: "💗", responsibility: "📋", aggression: "🔥",
    curiosity: "🔍", confidence: "💪", patience: "⏳", honesty: "🤝",
    relationship: "🧑‍🤝‍🧑", family: "🏠", career: "💼", contribution: "🌍"
};

const STAT_LABEL = {
    health: "건강", intelligence: "지능", charm: "매력", creativity: "창의성", mental: "정신력",
    stress: "스트레스", happiness: "행복", wealth: "자산",
    extroversion: "외향성", empathy: "공감력", responsibility: "책임감", aggression: "공격성",
    curiosity: "호기심", confidence: "자신감", patience: "인내심", honesty: "정직성",
    relationship: "인간관계", family: "가족", career: "커리어", contribution: "사회공헌"
};

function formatDeltas(deltas) {
    return Object.entries(deltas || {})
        .filter(([k, v]) => !HIDDEN_STAT_KEYS.has(k) && v)
        .map(([k, v]) => ({
            icon: STAT_ICON[k] || "▫️", label: STAT_LABEL[k] || k,
            value: Math.round(v * 10) / 10, positive: v > 0
        }));
}

// 오프닝 연출: 프로필/수치를 곧장 보여주는 대신 출생 장면을 단계별로 공개한다.
function formatBirthMoment(m) {
    const period = m.hour < 12 ? "오전" : "오후";
    const hour12 = m.hour % 12 === 0 ? 12 : m.hour % 12;
    return `${m.year}년 ${m.month}월 ${m.day}일 ${period} ${hour12}시 ${String(m.minute).padStart(2, "0")}분`;
}

function buildIntroSlides() {
    const g = player.genesis;
    return [
        `<div class="intro-slide">
            <p class="intro-tagline">당신은 이 세상에<br>단 한 번뿐인 인생을 살아갑니다.</p>
        </div>`,
        `<div class="intro-slide">
            <p class="intro-meta">${formatBirthMoment(g.birthMoment)}</p>
            <p class="intro-meta">${g.country.name} · ${g.birthMoment.hospital}</p>
            <p class="intro-cry">"응애!"</p>
        </div>`,
        `<div class="intro-slide">
            <p>긴 진통 끝에, 새로운 생명이 태어났다.</p>
            <p>${g.familyType.name}의 품에 안긴 아이는 앞으로 ${g.socialClass.name} 환경에서 자라나게 된다.</p>
        </div>`,
        `<div class="intro-slide">
            <p>👔 아버지 ${g.father.name}: <b>${g.father.occupation.name}</b> · 어머니 ${g.mother.name}: <b>${g.mother.occupation.name}</b></p>
            <p>🎓 양육 방식: <b>${g.parentingStyle.name}</b></p>
            <p>🔮 타고난 운명: <b>${g.destiny.name}</b> — ${g.destiny.desc}</p>
        </div>`,
        `<div class="intro-slide">
            <p>여섯 해가 조용히 흘렀다...</p>
            <p class="intro-meta">그 사이의 기억은 부모의 손에 맡겨졌다.</p>
        </div>`
    ];
}

let introStepIndex = 0;

function renderIntroSlide() {
    const slides = buildIntroSlides();
    const isLast = introStepIndex === slides.length - 1;
    document.getElementById("intro-summary").innerHTML = slides[introStepIndex];
    const btn = document.getElementById("intro-next-btn");
    btn.innerText = isLast ? "인생을 시작합니다" : "다음";
    btn.onclick = isLast ? beginGame : advanceIntro;
}

function advanceIntro() {
    introStepIndex++;
    renderIntroSlide();
}

function renderIntroScreen() {
    introStepIndex = 0;
    renderIntroSlide();
}

function updateStatPanel() {
    const s = player.stats;
    document.getElementById("ui-stage").innerText = player.lifeStage.name;
    document.getElementById("ui-age").innerText = player.age;
    document.getElementById("ui-turn").innerText = `${player.turn + 1} / ${player.lifeStage.turnsPerYear}`;
    document.getElementById("ui-ap").innerText = `${player.ap} / ${player.maxAp}`;
    document.getElementById("ui-health").innerText = Math.round(s.base.health);
    document.getElementById("ui-wealth").innerText = Math.round(s.base.wealth);
    document.getElementById("ui-happy").innerText = Math.round(s.base.happiness);
    document.getElementById("ui-stress").innerText = Math.round(s.base.stress);
    document.getElementById("ui-intelligence").innerText = Math.round(s.base.intelligence);
    document.getElementById("ui-charm").innerText = Math.round(s.base.charm);
    document.getElementById("ui-job").innerText = player.job ? `${player.job.name} (Lv.${player.job.level})` : (player.retired ? "은퇴" : "무직");
    document.getElementById("ui-education").innerText = player.education.enrolled
        ? (GDD.EDUCATION_STAGES.find(e => e.key === player.education.enrolled)?.name || "-")
        : "-";
    document.getElementById("ui-traits").innerText = player.traits.length
        ? player.traits.map(id => TRAIT_DB.find(t => t.id === id)?.name).join(", ")
        : "없음";
    document.getElementById("ui-conditions").innerText = player.conditions.length
        ? player.conditions.map(c => `🤒 ${c.name} (${c.duration}턴)`).join(", ")
        : "건강함";

    renderRelationshipPanel();
    renderLogPanel();
    renderTimelinePanel();
}

function renderRelationshipPanel() {
    const rel = player.relationships;
    const bar = (label, aff) => `
        <div class="rel-row">
            <span class="rel-name">${label}</span>
            <div class="rel-bar"><div class="rel-fill" style="width:${aff}%"></div></div>
            <span class="rel-value">${Math.round(aff)}</span>
        </div>`;
    let html = bar(`${rel.mother.role} ${rel.mother.name}`, rel.mother.affinity) + bar(`${rel.father.role} ${rel.father.name}`, rel.father.affinity);
    rel.friends.forEach(f => { html += bar(`친구 ${f.name}`, f.affinity); });
    if (rel.lover) html += bar(`${player.family.married ? "배우자" : "연인"} ${rel.lover.name}`, rel.lover.affinity);
    document.getElementById("relationship-panel").innerHTML = html;
}

function renderLogPanel() {
    const log = document.getElementById("log-panel");
    log.innerHTML = player.log.slice(-30).map(l => `<div>${l}</div>`).join("");
    log.scrollTop = log.scrollHeight;
}

function renderTimelinePanel() {
    const tl = document.getElementById("timeline-panel");
    tl.innerHTML = player.timeline.map(t => `
        <div class="timeline-item">
            <div class="timeline-age">${t.age}세</div>
            <div class="timeline-text">${t.text}</div>
        </div>`).join("");
}

function switchRecordTab(tab) {
    document.getElementById("log-panel").style.display = tab === "log" ? "block" : "none";
    document.getElementById("timeline-panel").style.display = tab === "timeline" ? "block" : "none";
    document.getElementById("tab-log").classList.toggle("active", tab === "log");
    document.getElementById("tab-timeline").classList.toggle("active", tab === "timeline");
}

function renderEventPhase() {
    updateStatPanel();
    document.getElementById("result-panel").style.display = "none";
    document.getElementById("choice-area").style.display = "block";

    const event = player.eventQueue[0];
    const narrativeBox = document.getElementById("ui-narrative");
    narrativeBox.style.display = "block";
    narrativeBox.innerText = `[${player.lifeStage.name}, ${player.age}세] ${event.text}`;

    const choiceArea = document.getElementById("choice-area");
    choiceArea.innerHTML = "";
    const numerals = ["①", "②", "③", "④"];
    event.choices.forEach((choice, i) => {
        const btn = document.createElement("button");
        btn.className = "choice-btn";
        btn.innerText = `${numerals[i] || "•"} ${choice.text}`;
        btn.onclick = () => resolveEventChoice(choice.id);
        choiceArea.appendChild(btn);
    });
}

// 1순위 개선: 선택 직후 스탯 변화를 먼저 크게 보여주고, 그 아래에 AI 서술을 붙인다.
function renderResultPhase() {
    updateStatPanel();
    document.getElementById("choice-area").style.display = "none";
    const panel = document.getElementById("result-panel");
    panel.style.display = "block";

    const { deltas, narrative } = player.pendingResult;
    const deltaHtml = formatDeltas(deltas).map(d => `
        <span class="delta-chip ${d.positive ? "pos" : "neg"}">${d.icon} ${d.label} ${d.positive ? "+" : ""}${d.value}</span>
    `).join("");

    document.getElementById("result-deltas").innerHTML = deltaHtml || `<span class="delta-chip">변화 없음</span>`;
    document.getElementById("result-narrative").innerText = narrative.content;
    document.getElementById("ui-narrative").style.display = "none";
}

function renderActionPhase() {
    updateStatPanel();
    document.getElementById("result-panel").style.display = "none";
    document.getElementById("choice-area").style.display = "block";
    const narrativeBox = document.getElementById("ui-narrative");
    narrativeBox.style.display = "block";
    narrativeBox.innerText = `[${player.lifeStage.name}, ${player.age}세] 행동을 선택하세요. (AP ${player.ap}/${player.maxAp})`;

    const choiceArea = document.getElementById("choice-area");
    choiceArea.innerHTML = "";

    const actions = actionManager.getAvailableActions(player);
    actions.forEach(action => {
        const btn = document.createElement("button");
        btn.className = "choice-btn";
        btn.disabled = player.ap < action.cost;
        btn.innerText = `${action.name} (AP ${action.cost})`;
        btn.onclick = () => performAction(action.id);
        choiceArea.appendChild(btn);
    });

    const endBtn = document.createElement("button");
    endBtn.className = "choice-btn end-btn";
    endBtn.innerText = "턴 종료";
    endBtn.onclick = () => endTurn();
    choiceArea.appendChild(endBtn);

    if (player.age >= 19) {
        const finishBtn = document.createElement("button");
        finishBtn.className = "choice-btn finish-btn";
        finishBtn.innerText = "이 인생을 마무리한다";
        finishBtn.onclick = () => requestVoluntaryEnd();
        choiceArea.appendChild(finishBtn);
    }
}

function renderEndScreen(result) {
    document.getElementById("game-screen").style.display = "none";
    const endScreen = document.getElementById("end-screen");
    endScreen.style.display = "block";

    document.getElementById("end-title").innerText =
        `게임 종료 - ${player.age}세 (${result.reason})`;

    document.getElementById("final-score").innerHTML = `
        <strong>🏆 Life Score: ${result.lifeScore.total}점 (${result.rank} 등급)</strong><br>
        재산 ${Math.round(result.lifeScore.detail.wealth)} · 커리어 ${Math.round(result.lifeScore.detail.career)} ·
        가족 ${Math.round(result.lifeScore.detail.family)} · 인간관계 ${Math.round(result.lifeScore.detail.relationship)}<br>
        건강 ${Math.round(result.lifeScore.detail.health)} · 행복 ${Math.round(result.lifeScore.detail.happiness)} ·
        명성 ${Math.round(result.lifeScore.detail.fame)} · 사회공헌 ${Math.round(result.lifeScore.detail.contribution)}
    `;

    document.getElementById("end-titles").innerText =
        result.titles.length ? `칭호: ${result.titles.join(", ")}` : "칭호: 없음";

    document.getElementById("end-biography").innerText = result.biography;

    document.getElementById("end-gravestone").innerHTML = `
        <div>${result.gravestone.name}</div>
        <div>${result.gravestone.birthYear} ~ ${result.gravestone.deathYear}</div>
        <div>향년 ${result.gravestone.deathAge}세</div>
        <div>${result.gravestone.job}</div>
        <div>Life Score : ${result.gravestone.lifeScore}</div>
        <div>칭호: ${result.gravestone.title}</div>
    `;

    document.getElementById("end-timeline").innerHTML = player.timeline.map(t => `
        <div class="timeline-item"><div class="timeline-age">${t.age}세</div><div class="timeline-text">${t.text}</div></div>
    `).join("");
}
