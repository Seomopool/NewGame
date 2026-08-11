// GDD Ch.5 Event DB — 돈/커리어 관련 도박성 이벤트.
window.GDD_EVENTS = (window.GDD_EVENTS || []).concat([
    {
        id: "EVT_STOCK_TIP", type: "Random", minAge: 19, maxAge: 130, baseWeight: 6,
        text: "친구에게서 솔깃한 투자 정보를 들었습니다.",
        choices: [
            { id: "invest", text: "투자한다 (도박)", effects: (p) => ({ "base.wealth": Math.random() > 0.5 ? 20 : -20 }) },
            { id: "skip", text: "무시한다", effects: {} }
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
        id: "EVT_JOB_OFFER_RIVAL", type: "Conditional", minAge: 22, maxAge: 55, baseWeight: 6, once: true,
        condition: (p) => !!p.job,
        text: "경쟁사에서 스카우트 제안이 왔습니다.",
        choices: [
            { id: "switch", text: "이직한다 (연봉은 오르지만 적응 스트레스가 있다)", effects: { "job.raise": true, "base.stress": 10 } },
            { id: "stay", text: "의리를 지킨다", effects: { "hidden.reputation": 5 } }
        ]
    }
]);
