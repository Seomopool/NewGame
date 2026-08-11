// GDD Ch.5 Event DB — 연애/결혼 관련 이벤트.
window.GDD_EVENTS = (window.GDD_EVENTS || []).concat([
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
        id: "EVT_BREAKUP_RISK", type: "Conditional", minAge: 15, maxAge: 60, baseWeight: 12,
        condition: (p) => p.relationships.lover && p.relationships.lover.affinity < 40,
        text: "연인과의 사이가 심상치 않습니다.",
        choices: [
            { id: "effort", text: "관계를 회복하려 노력한다", effects: { "relationship.lover": 20, "base.stress": 5 } },
            { id: "letgo", text: "이쯤에서 헤어지기로 한다", effects: { "relationship.loverBreakup": true, "base.stress": -5, "base.happiness": -5 } }
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
    }
]);
