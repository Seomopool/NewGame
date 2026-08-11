// GDD Ch.5 Event DB — 건강 관련 랜덤/조건부 이벤트.
window.GDD_EVENTS = (window.GDD_EVENTS || []).concat([
    {
        // GDD 리뷰: 감기를 즉시 효과가 아니라 duration이 있는 상태이상(GDD.CONDITIONS)으로 부여한다.
        id: "EVT_COLD", type: "Random", minAge: 3, maxAge: 130, baseWeight: 12,
        text: "감기에 걸렸습니다.",
        choices: [
            { id: "rest", text: "푹 쉬며 회복에 전념한다 (빨리 낫지만 그만큼 뒤처진다)", effects: { "base.wealth": -3, "condition.COLD_MILD": true } },
            { id: "push", text: "아파도 나가서 활동한다 (당장은 벌지만 오래 간다)", effects: { "base.wealth": 5, "condition.COLD_HARSH": true } }
        ]
    },
    {
        // 0~12세는 action phase가 없거나 제한적이라(REACT/PARTIAL) 스스로 병원에 갈 수 없다.
        // 건강이 위험한 수준으로 떨어지면 부모가 대신 나서도록 하는 안전장치.
        id: "EVT_CHILD_HEALTH_WATCH", type: "Conditional", minAge: 0, maxAge: 12, baseWeight: 25,
        condition: (p) => p.stats.base.health < 45,
        text: "아이가 계속 시름시름 앓자 부모님이 걱정스러운 얼굴로 지켜보고 있습니다.",
        choices: [
            { id: "hospital", text: "부모님이 병원에 데려간다", effects: { "base.health": 18, "base.wealth": -8, "relationship.parents": 3 } },
            { id: "home_remedy", text: "집에서 죽과 약으로 며칠 버틴다", effects: { "base.health": 8, "base.wealth": -2 } }
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
    {
        id: "EVT_HEALTH_CHECKUP_RESULT", type: "Random", minAge: 60, maxAge: 130, baseWeight: 10,
        text: "정기 건강검진 결과가 나왔습니다.",
        choices: [
            {
                id: "check", text: "결과를 확인한다",
                effects: (p) => Math.random() < 0.6 ? { "base.health": 5, "base.stress": -3 } : { "base.stress": 10, "base.health": -5 }
            }
        ]
    }
]);
