// DOM rendering — kept separate from game.js so game logic stays UI-agnostic.

function renderIntroScreen() {
    const g = player.genesis;
    document.getElementById("intro-summary").innerHTML = `
        <p>🌍 출생 국가: <b>${g.country.name}</b> (${g.environment})</p>
        <p>👨‍👩‍👧 가족 형태: <b>${g.familyType.name}</b> / 계층: <b>${g.socialClass.name}</b></p>
        <p>👔 아버지 직업: <b>${g.father.occupation.name}</b> / 어머니 직업: <b>${g.mother.occupation.name}</b></p>
        <p>🎓 양육 방식: <b>${g.parentingStyle.name}</b></p>
        <p>🧬 타고난 자질 — 지능 ${g.genetics.intelligence} / 건강 ${g.genetics.health} / 매력 ${g.genetics.charm}</p>
        <p>💰 초기 자산 수준: ${g.wealth}</p>
    `;
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

    const log = document.getElementById("log-panel");
    log.innerHTML = player.log.slice(-30).map(l => `<div>${l}</div>`).join("");
    log.scrollTop = log.scrollHeight;
}

function renderEventPhase() {
    updateStatPanel();
    const event = player.eventQueue[0];
    document.getElementById("ui-narrative").innerText = `[${player.lifeStage.name}, ${player.age}세] ${event.text}`;

    const choiceArea = document.getElementById("choice-area");
    choiceArea.innerHTML = "";
    event.choices.forEach(choice => {
        const btn = document.createElement("button");
        btn.className = "choice-btn";
        btn.innerText = choice.text;
        btn.onclick = () => resolveEventChoice(choice.id);
        choiceArea.appendChild(btn);
    });
}

function renderActionPhase() {
    updateStatPanel();
    document.getElementById("ui-narrative").innerText =
        `[${player.lifeStage.name}, ${player.age}세] 행동을 선택하세요. (AP ${player.ap}/${player.maxAp})`;

    const choiceArea = document.getElementById("choice-area");
    choiceArea.innerHTML = "";

    const actions = actionManager.getAvailableActions(player.lifeStage.key, !!player.job);
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
        <div>향년 ${result.gravestone.deathAge}세</div>
        <div>${result.gravestone.job}</div>
        <div>Life Score : ${result.gravestone.lifeScore}</div>
        <div>칭호: ${result.gravestone.title}</div>
    `;

    const historyHtml = player.log.map(l => `<div>${l}</div>`).join("");
    document.getElementById("history-log").innerHTML = historyHtml;
}
