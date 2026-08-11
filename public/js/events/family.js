// GDD Ch.5 Event DB — 부모/자녀와의 관계 기반 이벤트.
window.GDD_EVENTS = (window.GDD_EVENTS || []).concat([
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
        id: "EVT_GRANDCHILD", type: "Conditional", minAge: 65, maxAge: 130, baseWeight: 15, once: true,
        condition: (p) => p.family.children > 0,
        text: "손주가 태어났다는 소식을 들었습니다.",
        choices: [
            { id: "dote", text: "달려가 시간을 함께 보낸다", effects: { "base.happiness": 10, "derived.family": 10, "base.wealth": -5 } },
            { id: "distant", text: "축하 인사만 전한다", effects: { "base.happiness": 2 } }
        ]
    }
]);
