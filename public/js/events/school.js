// GDD Ch.5 Event DB — 학교 생활(학교폭력 체인, 나비효과 씨앗/회수, 학업 조건부 이벤트).
window.GDD_EVENTS = (window.GDD_EVENTS || []).concat([
    // ---- Chain Event: 학교폭력 목격 -> 가해자 재등장 -> 매듭 ----
    {
        id: "EVT_BULLY_WITNESS", type: "Conditional", minAge: 14, maxAge: 14, baseWeight: 25, once: true,
        condition: (p) => p.stats.personality.empathy >= 30,
        weightModifiers: (p) => (p.stats.hidden.karma < 0 ? 10 : 0),
        text: "학교폭력을 목격했습니다.",
        choices: [
            {
                id: "ignore", text: "모른 척한다 (마음은 편치 않지만 휘말리지 않는다)", effects: { "base.stress": 5, "hidden.karma": -15, "tag.IGNORED_BULLY": true },
                nextEvent: { id: "EVT_BULLY_RETURN", atAge: 15 }
            },
            {
                id: "report", text: "선생님께 알린다 (옳은 일이지만 표적이 될 위험을 감수한다)", effects: { "base.stress": 15, "personality.confidence": 10, "hidden.karma": 20, "tag.REPORTED_BULLY": true },
                nextEvent: { id: "EVT_BULLY_RETURN", atAge: 15 }
            }
        ]
    },
    {
        id: "EVT_BULLY_RETURN", type: "Chain", minAge: 15, maxAge: 15, baseWeight: 0, once: true,
        text: "그때의 가해자가 다시 나타났습니다.",
        choices: [
            {
                id: "avoid", text: "피한다 (안전하지만 찝찝함이 남는다)", effects: { "base.stress": 5, "personality.confidence": -3 },
                nextEvent: { id: "EVT_BULLY_REVENGE", atAge: 18 }
            },
            {
                id: "confront", text: "맞선다 (위험을 감수하고 자존감을 지킨다)", effects: { "personality.confidence": 8, "base.stress": 10 },
                nextEvent: { id: "EVT_BULLY_REVENGE", atAge: 18 }
            }
        ]
    },
    {
        id: "EVT_BULLY_REVENGE", type: "Chain", minAge: 18, maxAge: 18, baseWeight: 0, once: true,
        text: "그 시절의 악연이 마침내 매듭지어지는 순간이 찾아왔습니다.",
        choices: [
            { id: "forgive", text: "용서하고 흘려보낸다 (마음은 가벼워지지만 후련함은 덜하다)", effects: { "hidden.karma": 15, "base.happiness": 5 } },
            { id: "revenge", text: "되갚아준다 (통쾌하지만 뒷맛이 씁쓸하다)", effects: { "hidden.karma": -20, "hidden.reputation": 5, "base.happiness": 3 } }
        ]
    },

    // ---- 나비효과 씨앗(tag setter) ----
    {
        id: "EVT_HELP_CLASSMATE", type: "Random", minAge: 14, maxAge: 16, baseWeight: 10, once: true,
        text: "반 친구가 어려운 과제를 도와달라고 부탁했습니다.",
        choices: [
            { id: "help", text: "시간을 들여 도와준다", effects: { "relationship.friend": 6, "base.stress": 5, "tag.HELPED_CLASSMATE": true } },
            { id: "refuse", text: "내 할 일도 바쁘다며 거절한다", effects: { "relationship.friend": -3, "base.stress": -2 } }
        ]
    },
    {
        id: "EVT_MENTOR_OFFER", type: "Conditional", minAge: 13, maxAge: 18, baseWeight: 10, once: true,
        condition: (p) => p.stats.base.intelligence >= 65,
        text: "선생님이 방과 후 특별 지도를 제안하셨습니다.",
        choices: [
            { id: "accept", text: "받아들인다 (실력은 늘지만 자유시간이 줄어든다)", effects: { "base.intelligence": 8, "base.stress": 5, "tag.HAD_MENTOR": true } },
            { id: "decline", text: "정중히 사양한다", effects: { "base.stress": -2 } }
        ]
    },

    // ---- 나비효과 회수(tag callback) ----
    {
        id: "EVT_CLASSMATE_INTERVIEWER", type: "Conditional", minAge: 24, maxAge: 45, baseWeight: 20, once: true,
        condition: (p) => p.tags.HELPED_CLASSMATE && p.age - p.tags.HELPED_CLASSMATE.age >= 8,
        text: "면접장에 들어서니 낯익은 얼굴이 있었습니다. 예전에 과제를 도와줬던 그 친구가 인사담당자가 되어 있었습니다.",
        choices: [
            { id: "reconnect", text: "반갑게 인사를 건넨다", effects: { "hidden.reputation": 10, "base.wealth": 10, "relationship.friend": 8 } },
            { id: "professional", text: "공적인 태도를 유지한다", effects: { "hidden.reputation": 5 } }
        ]
    },
    {
        id: "EVT_MENTOR_REUNION", type: "Conditional", minAge: 30, maxAge: 60, baseWeight: 12, once: true,
        condition: (p) => p.tags.HAD_MENTOR && p.age - p.tags.HAD_MENTOR.age >= 15,
        text: "예전 은사님의 부고 소식을 들었습니다.",
        choices: [
            { id: "attend", text: "장례식에 참석해 마지막 인사를 전한다", effects: { "base.happiness": -5, "hidden.reputation": 8 } },
            { id: "skip", text: "사정이 있어 참석하지 못한다", effects: { "base.stress": 5, "hidden.karma": -5 } }
        ]
    },
    {
        id: "EVT_TALENT_SHOW", type: "Conditional", minAge: 16, maxAge: 25, baseWeight: 10, once: true,
        condition: (p) => !!p.tags.LEARNED_PIANO,
        text: "장기자랑에서 실력을 뽐낼 기회가 생겼습니다.",
        choices: [
            { id: "perform", text: "무대에 오른다", effects: { "hidden.fame": 8, "personality.confidence": 8, "base.stress": 5 } },
            { id: "pass", text: "부담스러워 넘긴다", effects: {} }
        ]
    },

    // ---- 학업 조건부 ----
    {
        id: "EVT_SCIENCE_FAIR", type: "Conditional", minAge: 13, maxAge: 18, baseWeight: 15,
        condition: (p) => p.stats.base.intelligence >= 75,
        text: "과학 경시대회에 참가할 기회가 주어졌습니다.",
        choices: [
            { id: "join", text: "참가한다 (부담은 크지만 성과가 남는다)", effects: { "base.intelligence": 5, "hidden.reputation": 5, "base.stress": 8, "tag.SCIENCE_TALENT": true } },
            { id: "skip", text: "포기한다", effects: { "base.stress": -3 } }
        ]
    },
    {
        id: "EVT_LEADER_ELECTION", type: "Conditional", minAge: 13, maxAge: 18, baseWeight: 12,
        condition: (p) => p.stats.personality.confidence >= 70,
        text: "학생회장 선거에 출마할 수 있습니다.",
        choices: [
            { id: "run", text: "출마한다 (책임은 무겁지만 존재감이 커진다)", effects: { "hidden.reputation": 10, "relationship.friend": 5, "base.stress": 5, "tag.WAS_LEADER": true } },
            { id: "no", text: "출마하지 않는다", effects: {} }
        ]
    }
]);
