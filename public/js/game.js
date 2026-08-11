// Main orchestrator — GDD Ch.2 Core Game Loop (Turn Pipeline) + UI binding.
// Start Turn -> Passive Update -> Mandatory/Conditional/Random Event -> Player Action(AP)
// -> Economy/Health Update -> Death Check -> AI Narrative -> End Turn.
// 선택/행동의 수치 반영은 EffectProcessor가 전담한다 (game.js는 흐름 제어에만 집중).
//
// 리뷰 반영: 나이에 따라 플레이어 통제권이 커진다 (GDD.AGENCY_BANDS).
// AUTO(0~5)는 아예 인터랙션 없이 부모가 전부 대신 선택하고, REACT(6~9)는 이벤트에는
// 반응하되 자유 행동(AP) 메뉴는 아직 없다. PARTIAL(10~13)부터 행동이 해금되고
// FREE(14~)부터 지금까지의 완전 자유 플레이와 동일하다.

const actionManager = new ActionManager();
const eventManager = new EventManager(window.GDD_EVENTS);
const personalityManager = new PersonalityManager();
const educationManager = new EducationManager();
const jobManager = new JobManager();
const endingManager = new EndingManager();
const relationshipManager = new RelationshipManager();
const effectProcessor = new EffectProcessor(jobManager, relationshipManager);

// 부모 양육 성향에 따라 AUTO 구간(0~5세)의 이벤트 선택지를 대신 고른다.
// health는 스타일과 무관하게 항상 챙긴다 — 방임형만 예외로 두어 "덜 챙긴다"는 특성을 살린다.
const PARENT_STYLE_WEIGHTS = {
    AUTHORITARIAN: { intelligence: 2, responsibility: 2, stress: -0.3, happiness: 0.5, health: 1.2 },
    AUTHORITATIVE: { happiness: 1.5, relationship: 1.5, intelligence: 1, stress: -0.5, health: 1.5 },
    PERMISSIVE: { happiness: 2, stress: -1, health: 1 },
    NEGLECTFUL: {}
};

function applyRawStatDelta(stats, key, value) {
    if (key in stats.base) stats.base[key] += value;
    else if (key in stats.personality) stats.personality[key] += value;
    else if (key in stats.hidden) stats.hidden[key] += value;
    stats.clampAll();
}

// 인생 연표(타임라인)에 남길 만한 굵직한 사건만 별도로 기록한다.
function addTimeline(player, text) {
    player.timeline.push({ age: player.age, text });
}

function getAgencyLevel(age) {
    return GDD.AGENCY_BANDS.find(b => age <= b.maxAge).key;
}

function createPlayer() {
    const genesis = ParentSystem.generate();
    const stats = new StatManager();
    stats.base.intelligence = genesis.genetics.intelligence;
    stats.base.health = genesis.genetics.health;
    stats.base.charm = genesis.genetics.charm;
    stats.base.wealth = genesis.wealth;

    const cm = genesis.country.modifiers || {};
    for (const k in cm) if (typeof cm[k] === "number") applyRawStatDelta(stats, k, cm[k]);
    const sc = genesis.socialClass.effects || {};
    for (const k in sc) applyRawStatDelta(stats, k, sc[k]);
    const ps = genesis.parentingStyle.effects || {};
    for (const k in ps) applyRawStatDelta(stats, k, ps[k]);
    const ds = genesis.destiny.effects || {};
    for (const k in ds) applyRawStatDelta(stats, k, ds[k]);
    stats.calculateHappiness();

    const player = {
        age: 0, turn: 0, totalTurns: 0,
        lifeStage: GDD.LIFE_STAGES[0],
        stats, genesis,
        education: { enrolled: null, highestCompleted: null, gpa: 0, major: null },
        job: null, retired: false, careerHistory: [],
        traits: [], habits: {}, tags: {}, conditions: [],
        relationships: relationshipManager.createInitial(genesis),
        crimeCount: 0, romanceCount: 0,
        family: { married: false, children: 0, householdWealth: genesis.householdWealth },
        wantsToEnd: false, isAlive: true,
        log: [], timeline: [], ap: 0, maxAp: 0,
        eventQueue: [], phase: "INTRO", pendingResult: null
    };
    addTimeline(player, `${genesis.country.name}, ${genesis.socialClass.name} 가정에서 태어났다.`);
    return player;
}

function getLifeStage(age) {
    return GDD.LIFE_STAGES.find(s => age >= s.minAge && age <= s.maxAge) || GDD.LIFE_STAGES[GDD.LIFE_STAGES.length - 1];
}

let player = createPlayer();

// ---------------- Turn Pipeline ----------------

function startTurn() {
    player.eventQueue = eventManager.selectEventsForTurn(player);
    player.phase = "EVENT";
    renderEventPhase();
}

function passiveUpdate() {
    const perTurnDecay = (player.age * 0.03) / player.lifeStage.turnsPerYear;
    player.stats.base.health -= perTurnDecay;
    player.stats.base.stress += Math.random() * 2 - 1.2; // 완만한 랜덤 드리프트
    player.stats.calculateHappiness();
    player.stats.clampAll();
}

// 감기 등 지속 상태이상을 매 턴 소모시킨다 (GDD 리뷰: duration 기반 질병 시스템).
function processConditions(player) {
    player.conditions = player.conditions.filter(c => {
        for (const stat in c.tickEffects) player.stats.increase("base", stat, c.tickEffects[stat]);
        c.duration -= 1;
        const recovered = c.duration <= 0 || Math.random() < c.recoveryChance;
        if (recovered) player.log.push(`[${player.age}세] ${c.name}에서 회복되었다.`);
        return !recovered;
    });
}

// 턴 시계 전진(수동 진행/자동 진행 공통 로직). 엔딩 트리거가 있으면 반환한다.
function advanceTurnClock() {
    passiveUpdate();
    processConditions(player);
    player.turn++;
    player.totalTurns++;

    if (player.turn >= player.lifeStage.turnsPerYear) {
        player.turn = 0;
        player.age++;
        yearlyResolution();
    }

    return endingManager.checkEndingTrigger(player);
}

function endTurn() {
    const trigger = advanceTurnClock();
    if (trigger) { finishGame(trigger); return; }
    startTurn();
}

const COMPULSORY_EDU_STAGES = ["ELEMENTARY", "MIDDLE_SCHOOL", "HIGH_SCHOOL"];

function updateEducation() {
    const stage = educationManager.getStage(player.age);
    if (!stage) return;

    if (COMPULSORY_EDU_STAGES.includes(stage.key) && player.education.enrolled !== stage.key) {
        if (player.education.enrolled) player.education.highestCompleted = player.education.enrolled;
        player.education.enrolled = stage.key;
    } else if (stage.key === "GRADUATED" && player.education.enrolled === "UNIVERSITY") {
        player.education.highestCompleted = "UNIVERSITY";
        player.education.enrolled = null;
    }

    if (player.education.enrolled && [...COMPULSORY_EDU_STAGES, "UNIVERSITY"].includes(player.education.enrolled)) {
        const score = educationManager.processSemester(player);
        const stageName = GDD.EDUCATION_STAGES.find(s => s.key === player.education.enrolled)?.name;
        player.log.push(`[학업] ${stageName} 성적: ${score}점 (GPA ${player.education.gpa})`);
    }
}

function yearlyResolution() {
    player.lifeStage = getLifeStage(player.age);
    updateEducation();

    const prevJobId = player.job?.id;
    const prevLevel = player.job?.level;
    jobManager.yearlyProgress(player);
    if (player.job && player.job.id === prevJobId && player.job.level > prevLevel) {
        addTimeline(player, `${player.job.name} Lv.${player.job.level}로 승진했다.`);
    } else if (!player.job && prevJobId) {
        addTimeline(player, `일자리를 잃었다.`);
    }

    personalityManager.updateTraits(player);
    personalityManager.yearlyAdjustment(player);
    endingManager.updateCareerScore(player);
}

function finishGame(trigger) {
    player.isAlive = false;
    const result = endingManager.buildResult(player, trigger);
    renderEndScreen(result);
}

// ---------------- AUTO band (0~5세): 부모가 전부 대신 선택한다 ----------------

function parentAutoChoice(event, player) {
    const weights = PARENT_STYLE_WEIGHTS[player.genesis.parentingStyle.id] || {};
    if (Object.keys(weights).length === 0) return event.choices[Math.floor(Math.random() * event.choices.length)];

    let best = event.choices[0], bestScore = -Infinity;
    for (const choice of event.choices) {
        const effects = typeof choice.effects === "function" ? choice.effects(player) : (choice.effects || {});
        let score = 0;
        for (const key in effects) {
            const stat = key.split(".").pop();
            if (typeof effects[key] === "number" && weights[stat]) score += effects[key] * weights[stat];
        }
        if (score > bestScore) { bestScore = score; best = choice; }
    }
    return best;
}

// 0~5세는 화면 전환 없이 조용히 흘러간다. 사망 시 true를 반환한다.
function autoFastForwardInfancy() {
    while (player.age < 6) {
        const events = eventManager.selectEventsForTurn(player);
        for (const event of events) {
            const choice = eventManager.executeChoice(event, parentAutoChoice(event, player).id, player);
            effectProcessor.apply(player, choice.effects);
        }
        const trigger = advanceTurnClock();
        if (trigger) { finishGame(trigger); return true; }
    }
    return false;
}

// ---------------- Event Phase ----------------

function resolveEventChoice(choiceId) {
    const event = player.eventQueue.shift();
    const choice = eventManager.executeChoice(event, choiceId, player);
    const deltas = effectProcessor.apply(player, choice.effects);

    const narrative = NarrativeGenerator.describeEventOutcome(event, choice, player);
    player.log.push(`[${player.age}세] ${narrative.content}`);
    if (event.type === "Mandatory" || event.type === "Chain" || event.milestone) {
        addTimeline(player, narrative.content);
    }

    player.pendingResult = { deltas, narrative, source: "event" };
    player.phase = "RESULT";
    renderResultPhase();
}

function continueAfterResult() {
    player.pendingResult = null;
    if (player.eventQueue.length > 0) {
        player.phase = "EVENT";
        renderEventPhase();
    } else if (getAgencyLevel(player.age) === "REACT") {
        // 6~9세: 이벤트에 반응만 할 뿐, 자유 행동 메뉴는 아직 없다.
        endTurn();
    } else {
        startActionPhase();
    }
}

// ---------------- Action Phase ----------------

function startActionPhase() {
    player.phase = "ACTION";
    player.maxAp = actionManager.calculateMaxAP(player.stats);
    player.ap = player.maxAp;
    renderActionPhase();
}

function performAction(actionId) {
    const action = GDD.ACTIONS.find(a => a.id === actionId);
    if (!action || player.ap < action.cost) return;

    player.ap -= action.cost;

    if (action.special === "employment") {
        const outcome = jobManager.attemptEmployment(player);
        if (outcome && outcome.success) {
            player.log.push(`[${player.age}세] 구직 성공: ${outcome.job.name}(으)로 취업했습니다.`);
            addTimeline(player, `${outcome.job.name}(으)로 첫 취업했다.`);
        } else {
            player.log.push(`[${player.age}세] 구직에 실패했습니다.`);
        }
    } else if (action.special === "propose") {
        const lover = player.relationships.lover;
        if (lover && lover.affinity >= action.requiresLoverAffinity) {
            player.family.married = true;
            player.stats.increase("derived", "family", 15);
            player.log.push(`[${player.age}세] ${lover.name}와(과) 결혼했습니다.`);
            addTimeline(player, `${lover.name}와(과) 결혼했다.`);
        } else {
            player.log.push(`[${player.age}세] 청혼했지만 거절당했습니다.`);
            if (lover) relationshipManager.adjustLover(player.relationships, -10);
            player.stats.applyStatGain("base", "happiness", -8);
        }
    } else if (action.special === "allowance") {
        if (player.family.householdWealth <= 0) {
            player.log.push(`[${player.age}세] "요즘 집안 사정이 넉넉지 않아" — 용돈을 받지 못했다.`);
        } else {
            const amount = Math.min(player.family.householdWealth, Math.floor(Math.random() * 10) + 5);
            player.family.householdWealth -= amount;
            player.stats.applyStatGain("base", "wealth", amount);
            relationshipManager.adjustParents(player.relationships, 1);
            player.log.push(`[${player.age}세] 부모님께 용돈을 받았다. (+${amount})`);
        }
    } else {
        const result = actionManager.executeAction(action, player.stats);

        if (action.special === "family") relationshipManager.adjustParents(player.relationships, result.effects.relationship || 0);
        else if (action.special === "social") relationshipManager.adjustFriend(player.relationships, result.effects.relationship || 0);
        else if (action.special === "romance") relationshipManager.adjustLover(player.relationships, result.effects.relationship || 0);

        effectProcessor.apply(player, result.effects);
        personalityManager.updateHabits(player, action.id);
        if (action.type === "Crime") player.crimeCount++;
        if (action.type === "Romance") player.romanceCount++;
        player.log.push(`[${player.age}세] ${NarrativeGenerator.describeActionOutcome(action, result)}`);
    }

    renderActionPhase();
    if (player.ap <= 0) endTurn();
}

function requestVoluntaryEnd() {
    player.wantsToEnd = true;
    endTurn();
}

// ---------------- Boot ----------------

function beginGame() {
    document.getElementById("intro-screen").style.display = "none";
    document.getElementById("game-screen").style.display = "block";

    const diedInInfancy = autoFastForwardInfancy();
    if (diedInInfancy) return;

    addTimeline(player, "이제 조금씩 세상을 스스로 이해하기 시작했다.");
    startTurn();
}

renderIntroScreen();
