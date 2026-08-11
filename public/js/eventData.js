// GDD Ch.5.4 Event JSON Schema — replaces the old public/event.js prototype pool.
// effects use "group.stat" dot-paths resolved by GameController.applyEffects().
window.GDD_EVENTS = [
    // ---- Mandatory (나이/조건에 따라 반드시 발생) ----
    {
        id: "EVT_ELEMENTARY", type: "Mandatory", minAge: 7, maxAge: 7, baseWeight: 100, once: true,
        text: "초등학교에 입학했습니다.",
        choices: [{ id: "ok", text: "새로운 시작이다", effects: { "personality.extroversion": 2 } }]
    },
    {
        id: "EVT_MIDDLE_SCHOOL", type: "Mandatory", minAge: 13, maxAge: 13, baseWeight: 100, once: true,
        text: "중학교에 입학했습니다.",
        choices: [{ id: "ok", text: "긴장되지만 기대된다", effects: { "base.stress": 5 } }]
    },
    {
        id: "EVT_HIGH_SCHOOL", type: "Mandatory", minAge: 16, maxAge: 16, baseWeight: 100, once: true,
        text: "고등학교에 입학했습니다.",
        choices: [{ id: "ok", text: "진로를 고민하기 시작한다", effects: { "personality.responsibility": 2 } }]
    },
    {
        id: "EVT_GRADUATION_PATH", type: "Mandatory", minAge: 19, maxAge: 19, baseWeight: 100, once: true,
        text: "고등학교를 졸업했습니다. 앞으로의 길을 선택하세요.",
        choices: [
            { id: "univ", text: "대학교에 진학한다", effects: { "education.highestCompleted": "HIGH_SCHOOL", "education.enrolled": "UNIVERSITY", "base.stress": 5 } },
            { id: "job", text: "바로 취업 전선에 뛰어든다", effects: { "education.highestCompleted": "HIGH_SCHOOL", "education.enrolled": "GRADUATED", "base.wealth": 5 } }
        ]
    },
    {
        id: "EVT_RETIREMENT", type: "Mandatory", minAge: 60, maxAge: 60, baseWeight: 100, once: true,
        text: "은퇴를 고려할 나이가 되었습니다.",
        choices: [
            { id: "retire", text: "은퇴하고 여생을 즐긴다", effects: { "job.retire": true, "base.happiness": 10 } },
            { id: "keep", text: "계속 일한다", effects: { "base.stress": 5 } }
        ]
    },

    // ---- Chain Event (GDD 5.2 예시: 학교폭력 목격 -> 가해자 재등장 -> 복수) ----
    {
        id: "EVT_BULLY_WITNESS", type: "Conditional", minAge: 14, maxAge: 14, baseWeight: 25, once: true,
        condition: (p) => p.stats.personality.empathy >= 30,
        weightModifiers: (p) => (p.stats.hidden.karma < 0 ? 10 : 0),
        text: "학교폭력을 목격했습니다.",
        choices: [
            {
                id: "ignore", text: "모른 척한다", effects: { "base.stress": 10, "hidden.karma": -15 },
                nextEvent: { id: "EVT_BULLY_RETURN", atAge: 15 }
            },
            {
                id: "report", text: "선생님께 알린다", effects: { "base.stress": 15, "personality.confidence": 10, "hidden.karma": 20 },
                nextEvent: { id: "EVT_BULLY_RETURN", atAge: 15 }
            }
        ]
    },
    {
        id: "EVT_BULLY_RETURN", type: "Chain", minAge: 15, maxAge: 15, baseWeight: 0, once: true,
        text: "그때의 가해자가 다시 나타났습니다.",
        choices: [
            {
                id: "avoid", text: "피한다", effects: { "base.stress": 5 },
                nextEvent: { id: "EVT_BULLY_REVENGE", atAge: 18 }
            },
            {
                id: "confront", text: "맞선다", effects: { "personality.confidence": 8, "base.stress": 10 },
                nextEvent: { id: "EVT_BULLY_REVENGE", atAge: 18 }
            }
        ]
    },
    {
        id: "EVT_BULLY_REVENGE", type: "Chain", minAge: 18, maxAge: 18, baseWeight: 0, once: true,
        text: "그 시절의 악연이 마침내 매듭지어지는 순간이 찾아왔습니다.",
        choices: [
            { id: "forgive", text: "용서하고 흘려보낸다", effects: { "hidden.karma": 15, "base.happiness": 5 } },
            { id: "revenge", text: "되갚아준다", effects: { "hidden.karma": -20, "hidden.reputation": 5 } }
        ]
    },

    // ---- Conditional ----
    {
        id: "EVT_SCIENCE_FAIR", type: "Conditional", minAge: 13, maxAge: 18, baseWeight: 15,
        condition: (p) => p.stats.base.intelligence >= 75,
        text: "과학 경시대회에 참가할 기회가 주어졌습니다.",
        choices: [
            { id: "join", text: "참가한다", effects: { "base.intelligence": 5, "hidden.reputation": 5, "base.stress": 8 } },
            { id: "skip", text: "포기한다", effects: { "base.stress": -3 } }
        ]
    },
    {
        id: "EVT_LEADER_ELECTION", type: "Conditional", minAge: 13, maxAge: 18, baseWeight: 12,
        condition: (p) => p.stats.personality.confidence >= 70,
        text: "학생회장 선거에 출마할 수 있습니다.",
        choices: [
            { id: "run", text: "출마한다", effects: { "hidden.reputation": 10, "derived.relationship": 5, "base.stress": 5 } },
            { id: "no", text: "출마하지 않는다", effects: {} }
        ]
    },

    // ---- Random ----
    {
        id: "EVT_COLD", type: "Random", minAge: 3, maxAge: 130, baseWeight: 12,
        text: "감기에 걸렸습니다.",
        choices: [
            { id: "rest", text: "푹 쉰다", effects: { "base.health": -3, "base.stress": -2 } },
            { id: "push", text: "무리해서 활동한다", effects: { "base.health": -8 } }
        ]
    },
    {
        id: "EVT_FRIEND_FIGHT", type: "Random", minAge: 7, maxAge: 60, baseWeight: 10,
        weightModifiers: (p) => (p.stats.personality.aggression > 60 ? 10 : 0),
        text: "친구와 크게 다투었습니다.",
        choices: [
            { id: "apologize", text: "먼저 사과한다", effects: { "derived.relationship": 5, "personality.empathy": 2 } },
            { id: "ignore", text: "무시한다", effects: { "derived.relationship": -8, "base.stress": 5 } }
        ]
    },
    {
        id: "EVT_WALLET", type: "Random", minAge: 10, maxAge: 130, baseWeight: 8,
        text: "길에서 지갑을 발견했습니다.",
        choices: [
            { id: "return", text: "주인을 찾아준다", effects: { "hidden.karma": 15, "hidden.reputation": 3 } },
            { id: "keep", text: "그냥 가져간다", effects: { "base.wealth": 10, "hidden.karma": -15 } }
        ]
    },
    {
        id: "EVT_STREET_PERFORM", type: "Random", minAge: 13, maxAge: 40, baseWeight: 6,
        condition: (p) => p.stats.base.creativity >= 60,
        text: "길거리 공연을 해볼 기회가 생겼습니다.",
        choices: [
            { id: "perform", text: "공연한다", effects: { "hidden.fame": 5, "personality.confidence": 5 } },
            { id: "no", text: "쑥스러워서 관둔다", effects: {} }
        ]
    },
    {
        id: "EVT_TRAVEL", type: "Random", minAge: 19, maxAge: 130, baseWeight: 8,
        text: "여행을 떠날 기회가 생겼습니다.",
        choices: [
            { id: "go", text: "떠난다", effects: { "base.wealth": -15, "base.happiness": 10, "base.stress": -10 } },
            { id: "stay", text: "돈을 아낀다", effects: { "base.wealth": 5 } }
        ]
    },
    {
        id: "EVT_FIRST_LOVE", type: "Random", minAge: 13, maxAge: 25, baseWeight: 10, once: true,
        text: "누군가에게 첫사랑의 감정을 느꼈습니다.",
        choices: [
            { id: "confess", text: "고백한다", effects: { "derived.relationship": 10, "personality.confidence": 5, "base.happiness": 8 } },
            { id: "hide", text: "마음을 숨긴다", effects: { "base.stress": 5 } }
        ]
    },
    {
        id: "EVT_STOCK_TIP", type: "Random", minAge: 19, maxAge: 130, baseWeight: 6,
        text: "친구에게서 솔깃한 투자 정보를 들었습니다.",
        choices: [
            { id: "invest", text: "투자한다 (도박)", effects: { "base.wealth": (Math.random() > 0.5 ? 20 : -20) } },
            { id: "skip", text: "무시한다", effects: {} }
        ]
    },

    // ---- Global (세계 이벤트) ----
    {
        id: "EVT_RECESSION", type: "Global", minAge: 19, maxAge: 130, baseWeight: 4,
        text: "경기 침체가 찾아왔습니다.",
        choices: [{ id: "endure", text: "허리띠를 졸라맨다", effects: { "base.wealth": -8, "base.stress": 8 } }]
    },
    {
        id: "EVT_AI_BOOM", type: "Global", minAge: 19, maxAge: 130, baseWeight: 3,
        text: "AI 기술 붐이 사회 전반을 뒤흔들고 있습니다.",
        choices: [
            { id: "adapt", text: "새 기술을 배운다", effects: { "base.intelligence": 5, "base.stress": 5 } },
            { id: "ignore", text: "관심 없다", effects: {} }
        ]
    }
];
