// Main orchestrator — GDD Ch.2 Core Game Loop (Turn Pipeline) + UI binding.
// Start Turn -> Passive Update -> Mandatory/Conditional/Random Event -> Player Action(AP)
// -> Economy/Health Update -> Death Check -> AI Narrative -> End Turn.

const actionManager = new ActionManager();
const eventManager = new EventManager(window.GDD_EVENTS);
const personalityManager = new PersonalityManager();
const educationManager = new EducationManager();
const jobManager = new JobManager();
const endingManager = new EndingManager();
const relationshipManager = new RelationshipManager();

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

function applyEffects(player, effects) {
    const numericDeltas = {};
    for (const key in effects) {
        const value = effects[key];
        if (key === "education.enrolled") { player.education.enrolled = value; continue; }
        if (key === "education.highestCompleted") { player.education.highestCompleted = value; continue; }
        if (key === "job.retire") { if (value) { jobManager.processRetirement(player); player.wantsToEnd = true; } continue; }
        if (key === "job.raise") {
            if (value && player.job) {
                player.job.level += 1;
                player.job.salary = jobManager.calculateSalary(player.job);
                addTimeline(player, `${player.job.name} 이직/연봉 협상 성공 (Lv.${player.job.level})`);
            }
            continue;
        }
        if (key === "married") { if (value) { player.family.married = true; player.stats.increase("derived", "family", 15); } continue; }
        if (key === "children") { player.family.children += value; player.stats.increase("derived", "family", 10 * value); continue; }
        if (key.startsWith("tag.")) { if (value) player.tags[key.slice(4)] = { age: player.age }; continue; }
        if (key === "relationship.parents") { relationshipManager.adjustParents(player.relationships, value); continue; }
        if (key === "relationship.friend") { relationshipManager.adjustFriend(player.relationships, value); continue; }
        if (key === "relationship.lover") { relationshipManager.adjustLover(player.relationships, value); continue; }
        if (key === "relationship.loverBreakup") { if (value) player.relationships.lover = null; continue; }

        if (typeof value !== "number") continue;
        if (key.includes(".")) {
            const [group, stat] = key.split(".");
            if (player.stats[group] && stat in player.stats[group]) {
                player.stats.applyStatGain(group, stat, value);
                numericDeltas[stat] = (numericDeltas[stat] || 0) + value;
            }
        } else {
            // GDD.ACTIONS는 "group.stat" 대신 평평한 키(health, wealth, karma ...)를 쓴다.
            const group = ["base", "personality", "hidden", "derived"].find(g => key in player.stats[g]);
            if (group) {
                player.stats.applyStatGain(group, key, value);
                numericDeltas[key] = (numericDeltas[key] || 0) + value;
            }
        }
    }
    return numericDeltas;
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
    stats.calculateHappiness();

    const player = {
        age: 0, turn: 0, totalTurns: 0,
        lifeStage: GDD.LIFE_STAGES[0],
        stats, genesis,
        education: { enrolled: null, highestCompleted: null, gpa: 0, major: null },
        job: null, retired: false, careerHistory: [],
        traits: [], habits: {}, tags: {},
        relationships: relationshipManager.createInitial(genesis),
        crimeCount: 0, romanceCount: 0,
        family: { married: false, children: 0 },
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

function endTurn() {
    passiveUpdate();
    player.turn++;
    player.totalTurns++;

    if (player.turn >= player.lifeStage.turnsPerYear) {
        player.turn = 0;
        player.age++;
        yearlyResolution();
    }

    const trigger = endingManager.checkEndingTrigger(player);
    if (trigger) {
        finishGame(trigger);
        return;
    }

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

// ---------------- Event Phase ----------------

function resolveEventChoice(choiceId) {
    const event = player.eventQueue.shift();
    const choice = eventManager.executeChoice(event, choiceId, player);
    const deltas = applyEffects(player, choice.effects);

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
    } else {
        const result = actionManager.executeAction(action, player.stats);

        if (action.special === "family") relationshipManager.adjustParents(player.relationships, result.effects.relationship || 0);
        else if (action.special === "social") relationshipManager.adjustFriend(player.relationships, result.effects.relationship || 0);
        else if (action.special === "romance") relationshipManager.adjustLover(player.relationships, result.effects.relationship || 0);

        applyEffects(player, result.effects);
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
    startTurn();
}

renderIntroScreen();
