// GDD Ch.5 Event DB — 유년기 취미/우연한 만남 이벤트.
window.GDD_EVENTS = (window.GDD_EVENTS || []).concat([
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
    {
        id: "EVT_STRAY_CAT", type: "Random", minAge: 7, maxAge: 45, baseWeight: 7, once: true,
        text: "길에서 다친 길고양이를 발견했습니다.",
        choices: [
            { id: "save", text: "병원에 데려가 구조한다 (돈이 들지만 마음이 편하다)", effects: { "hidden.karma": 10, "base.wealth": -5, "tag.SAVED_CAT": true } },
            { id: "ignore", text: "안타깝지만 지나친다", effects: { "hidden.karma": -3 } }
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
    }
]);
