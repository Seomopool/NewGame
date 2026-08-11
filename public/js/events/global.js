// GDD Ch.5 Event DB — 모든 플레이어에게 공통 적용되는 세계 이벤트.
window.GDD_EVENTS = (window.GDD_EVENTS || []).concat([
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
]);
