// GDD Ch.5.4 Event JSON Schema — expanded per reviewer feedback:
// (1) every real choice now has a genuine trade-off (no free-lunch options),
// (2) choice.effects may be a function(player) for probabilistic outcomes,
// (3) "tag.NAME": true marks a butterfly-effect flag other events can read
//     decades later via condition(player) => player.tags.NAME, matching the
//     GDD 1.2 나비효과 pillar and the literal Ch.5 예시("20년 전 도운 사람이 찾아옴").
// (4) "relationship.parents/friend/lover" route deltas to named NPCs instead
//     of the generic derived.relationship score.
window.GDD_EVENTS = [
    // ---- Mandatory ----
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
            { id: "univ", text: "대학교에 진학한다 (시간과 돈을 더 쓰지만 더 넓은 문이 열린다)", effects: { "education.highestCompleted": "HIGH_SCHOOL", "education.enrolled": "UNIVERSITY", "base.stress": 5, "tag.WENT_TO_UNIVERSITY": true } },
            { id: "job", text: "바로 취업 전선에 뛰어든다 (당장의 돈, 대신 선택지는 좁아진다)", effects: { "education.highestCompleted": "HIGH_SCHOOL", "education.enrolled": "GRADUATED", "base.wealth": 5, "tag.SKIPPED_UNIVERSITY": true } }
        ]
    },
    {
        id: "EVT_RETIREMENT", type: "Mandatory", minAge: 60, maxAge: 60, baseWeight: 100, once: true,
        text: "은퇴를 고려할 나이가 되었습니다.",
        choices: [
            { id: "retire", text: "은퇴하고 여생을 즐긴다", effects: { "job.retire": true, "base.happiness": 10 } },
            { id: "keep", text: "계속 일한다 (소득은 유지되지만 몸은 못 속인다)", effects: { "base.stress": 5, "base.health": -3 } }
        ]
    },

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
        id: "EVT_STRAY_CAT", type: "Random", minAge: 7, maxAge: 45, baseWeight: 7, once: true,
        text: "길에서 다친 길고양이를 발견했습니다.",
        choices: [
            { id: "save", text: "병원에 데려가 구조한다 (돈이 들지만 마음이 편하다)", effects: { "hidden.karma": 10, "base.wealth": -5, "tag.SAVED_CAT": true } },
            { id: "ignore", text: "안타깝지만 지나친다", effects: { "hidden.karma": -3 } }
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
        id: "EVT_CAT_OWNER_RETURN", type: "Conditional", minAge: 25, maxAge: 60, baseWeight: 15, once: true,
        condition: (p) => p.tags.SAVED_CAT && p.age - p.tags.SAVED_CAT.age >= 10,
        text: "오래전 구해줬던 고양이의 주인이라는 사람이 은인을 수소문 끝에 찾아왔습니다.",
        choices: [
            { id: "accept", text: "감사 인사와 선물을 받는다", effects: { "base.wealth": 25, "base.happiness": 5 } },
            { id: "decline", text: "정중히 사양한다", effects: { "hidden.karma": 10, "hidden.reputation": 5 } }
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

    // ---- Childhood variety ----
    {
        id: "EVT_PIANO_LESSON", type: "Conditional", minAge: 7, maxAge: 12, baseWeight: 8, once: true,
        condition: (p) => p.stats.base.creativity >= 55,
        text: "피아노 학원 등록을 제안받았습니다.",
        choices: [
            { id: "start", text: "시작한다 (재능은 늘지만 학원비가 든다)", effects: { "base.creativity": 8, "base.wealth": -5, "base.stress": 3, "tag.LEARNED_PIANO": true } },
            { id: "skip", text: "관심 없다며 넘긴다", effects: {} }
        ]
    },
    {
        id: "EVT_SPORTS_TEAM", type: "Conditional", minAge: 7, maxAge: 15, baseWeight: 8,
        condition: (p) => p.stats.base.health >= 55,
        text: "동네 축구팀에서 함께하자고 제안했습니다.",
        choices: [
            { id: "join", text: "합류한다", effects: { "base.health": 6, "relationship.friend": 5, "base.stress": 3 } },
            { id: "skip", text: "혼자 노는 게 편하다며 거절한다", effects: {} }
        ]
    },
    {
        id: "EVT_CLASS_PET", type: "Random", minAge: 7, maxAge: 12, baseWeight: 6,
        text: "학급 화분 돌보기 당번을 맡게 되었습니다.",
        choices: [
            { id: "responsible", text: "정성껏 돌본다", effects: { "personality.responsibility": 5, "base.stress": 3 } },
            { id: "careless", text: "귀찮아서 대충 한다", effects: { "personality.responsibility": -3, "hidden.karma": -3 } }
        ]
    },

    // ---- Conditional (관계 기반) ----
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
    },
    {
        id: "EVT_PARENT_CONFLICT", type: "Conditional", minAge: 13, maxAge: 18, baseWeight: 10,
        condition: (p) => (p.relationships.mother.affinity + p.relationships.father.affinity) / 2 < 50,
        text: "부모님과 크게 다퉜습니다.",
        choices: [
            { id: "reconcile", text: "대화로 풀어본다", effects: { "relationship.parents": 12, "base.stress": 5 } },
            { id: "distance", text: "거리를 둔다 (독립심은 자라지만 사이는 멀어진다)", effects: { "relationship.parents": -8, "personality.responsibility": 5 } }
        ]
    },
    {
        id: "EVT_CLOSE_TO_PARENT", type: "Conditional", minAge: 19, maxAge: 30, baseWeight: 10, once: true,
        condition: (p) => (p.relationships.mother.affinity + p.relationships.father.affinity) / 2 >= 80,
        text: "부모님이 자랑스러워하며 큰 지원을 해주겠다고 하십니다.",
        choices: [
            { id: "accept", text: "감사히 받는다", effects: { "base.wealth": 20, "derived.family": 5 } },
            { id: "decline", text: "스스로 힘으로 서보겠다며 사양한다", effects: { "personality.responsibility": 5, "personality.confidence": 5 } }
        ]
    },
    {
        id: "EVT_BREAKUP_RISK", type: "Conditional", minAge: 15, maxAge: 60, baseWeight: 12,
        condition: (p) => p.relationships.lover && p.relationships.lover.affinity < 40,
        text: "연인과의 사이가 심상치 않습니다.",
        choices: [
            { id: "effort", text: "관계를 회복하려 노력한다", effects: { "relationship.lover": 20, "base.stress": 5 } },
            { id: "letgo", text: "이쯤에서 헤어지기로 한다", effects: { "relationship.loverBreakup": true, "base.stress": -5, "base.happiness": -5 } }
        ]
    },
    {
        id: "EVT_FRIEND_BETRAYAL", type: "Random", minAge: 14, maxAge: 60, baseWeight: 6,
        condition: (p) => p.relationships.friends.length > 0,
        text: "친한 친구가 뒷담화를 했다는 소문을 들었습니다.",
        choices: [
            { id: "confront", text: "직접 따진다 (속은 시원하지만 사이는 틀어진다)", effects: { "relationship.friend": -20, "personality.confidence": 5, "base.stress": 5 } },
            { id: "slide", text: "그냥 넘어간다 (평화롭지만 앙금은 남는다)", effects: { "relationship.friend": -5, "base.stress": -2 } }
        ]
    },

    // ---- Random (재설계: 모든 선택지에 손익이 공존) ----
    {
        id: "EVT_COLD", type: "Random", minAge: 3, maxAge: 130, baseWeight: 12,
        text: "감기에 걸렸습니다.",
        choices: [
            { id: "rest", text: "쉬면서 회복한다 (건강엔 좋지만 그만큼 뒤처진다)", effects: { "base.health": -2, "base.stress": -3, "base.wealth": -3 } },
            { id: "push", text: "아파도 나가서 활동한다 (돈은 벌지만 몸이 상한다)", effects: { "base.health": -8, "base.wealth": 8 } }
        ]
    },
    {
        id: "EVT_FRIEND_FIGHT", type: "Random", minAge: 7, maxAge: 60, baseWeight: 10,
        condition: (p) => p.relationships.friends.length > 0,
        weightModifiers: (p) => (p.stats.personality.aggression > 60 ? 10 : 0),
        text: "친구와 크게 다투었습니다.",
        choices: [
            { id: "apologize", text: "먼저 사과한다 (관계는 지키지만 자존심은 접는다)", effects: { "relationship.friend": 5, "personality.empathy": 2, "personality.confidence": -2 } },
            { id: "standground", text: "내 입장을 굽히지 않는다 (자존감은 지키지만 관계가 상한다)", effects: { "relationship.friend": -8, "personality.confidence": 5 } }
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
            {
                id: "perform", text: "무대에 선다 (반응은 반반이다)",
                effects: (p) => Math.random() < 0.6
                    ? { "hidden.fame": 8, "personality.confidence": 6 }
                    : { "personality.confidence": -5, "base.stress": 5 }
            },
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
            {
                id: "confess", text: "고백한다 (잘 되면 큰 행복, 아니면 쓰라린 기억)",
                effects: (p) => Math.random() < 0.55
                    ? { "relationship.lover": 12, "personality.confidence": 5, "base.happiness": 8 }
                    : { "personality.confidence": -6, "base.stress": 10, "base.happiness": -5 }
            },
            { id: "hide", text: "마음을 숨긴다 (안전하지만 후회가 남는다)", effects: { "base.stress": 5, "hidden.trauma": 3 } }
        ]
    },
    {
        id: "EVT_STOCK_TIP", type: "Random", minAge: 19, maxAge: 130, baseWeight: 6,
        text: "친구에게서 솔깃한 투자 정보를 들었습니다.",
        choices: [
            { id: "invest", text: "투자한다 (도박)", effects: (p) => ({ "base.wealth": Math.random() > 0.5 ? 20 : -20 }) },
            { id: "skip", text: "무시한다", effects: {} }
        ]
    },
    {
        id: "EVT_JOB_OFFER_RIVAL", type: "Conditional", minAge: 22, maxAge: 55, baseWeight: 6, once: true,
        condition: (p) => !!p.job,
        text: "경쟁사에서 스카우트 제안이 왔습니다.",
        choices: [
            { id: "switch", text: "이직한다 (연봉은 오르지만 적응 스트레스가 있다)", effects: { "job.raise": true, "base.stress": 10 } },
            { id: "stay", text: "의리를 지킨다", effects: { "hidden.reputation": 5 } }
        ]
    },
    {
        id: "EVT_LOTTERY", type: "Random", minAge: 19, maxAge: 130, baseWeight: 4,
        text: "재미 삼아 복권을 샀습니다.",
        choices: [
            { id: "buy", text: "결과를 확인한다", effects: (p) => Math.random() < 0.05 ? { "base.wealth": 80 } : { "base.wealth": -2 } },
            { id: "skip", text: "사지 않는다", effects: {} }
        ]
    },
    {
        id: "EVT_HEALTH_SCARE", type: "Conditional", minAge: 19, maxAge: 130, baseWeight: 10,
        condition: (p) => p.stats.base.health < 40,
        text: "건강 이상 신호가 느껴집니다.",
        choices: [
            { id: "doctor", text: "병원에 간다", effects: { "base.wealth": -15, "base.health": 15 } },
            { id: "ignore", text: "괜찮겠지 하고 넘긴다", effects: { "base.health": -10, "base.stress": 10 } }
        ]
    },
    {
        id: "EVT_BURNOUT_WARNING", type: "Conditional", minAge: 19, maxAge: 60, baseWeight: 10,
        condition: (p) => p.stats.base.stress >= 80,
        text: "번아웃 직전입니다.",
        choices: [
            { id: "break", text: "휴가를 낸다 (수입은 줄지만 회복된다)", effects: { "base.stress": -25, "base.wealth": -5 } },
            { id: "push", text: "그냥 버틴다", effects: { "base.stress": 10, "base.health": -5 } }
        ]
    },

    // ---- Elder (60+) ----
    {
        id: "EVT_GRANDCHILD", type: "Conditional", minAge: 65, maxAge: 130, baseWeight: 15, once: true,
        condition: (p) => p.family.children > 0,
        text: "손주가 태어났다는 소식을 들었습니다.",
        choices: [
            { id: "dote", text: "달려가 시간을 함께 보낸다", effects: { "base.happiness": 10, "derived.family": 10, "base.wealth": -5 } },
            { id: "distant", text: "축하 인사만 전한다", effects: { "base.happiness": 2 } }
        ]
    },
    {
        id: "EVT_HEALTH_CHECKUP_RESULT", type: "Random", minAge: 60, maxAge: 130, baseWeight: 10,
        text: "정기 건강검진 결과가 나왔습니다.",
        choices: [
            {
                id: "check", text: "결과를 확인한다",
                effects: (p) => Math.random() < 0.6 ? { "base.health": 5, "base.stress": -3 } : { "base.stress": 10, "base.health": -5 }
            }
        ]
    },
    {
        id: "EVT_LIFE_REFLECTION", type: "Random", minAge: 60, maxAge: 130, baseWeight: 8,
        text: "지난 삶을 돌아보게 되는 밤이었습니다.",
        choices: [
            { id: "content", text: "그럭저럭 만족스러운 삶이었다고 생각한다", effects: { "base.happiness": 8 } },
            { id: "regret", text: "이루지 못한 것들이 자꾸 떠오른다", effects: { "base.stress": 5, "base.happiness": -5 } }
        ]
    },
    {
        id: "EVT_LATE_ROMANCE", type: "Conditional", minAge: 60, maxAge: 130, baseWeight: 8,
        condition: (p) => !p.family.married,
        text: "황혼의 인연을 만날 기회가 생겼습니다.",
        choices: [
            { id: "open", text: "마음을 열어본다", effects: { "relationship.lover": 15, "base.happiness": 10 } },
            { id: "alone", text: "지금 이대로가 편하다", effects: { "base.stress": -3 } }
        ]
    },

    // ---- Global ----
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
    },
    {
        id: "EVT_PANDEMIC", type: "Global", minAge: 19, maxAge: 130, baseWeight: 3,
        text: "감염병이 전 세계를 휩쓸고 있습니다.",
        choices: [
            { id: "careful", text: "조심하며 지낸다 (건강은 지키지만 수입이 준다)", effects: { "base.wealth": -10, "base.stress": 5 } },
            { id: "carefree", text: "평소처럼 지낸다 (자유롭지만 위험을 감수한다)", effects: { "base.health": -10, "base.stress": -2 } }
        ]
    }
];
