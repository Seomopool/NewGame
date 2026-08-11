// GDD Ch.5 Event DB — 친구/사회생활 관련 랜덤 이벤트.
window.GDD_EVENTS = (window.GDD_EVENTS || []).concat([
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
        id: "EVT_FRIEND_BETRAYAL", type: "Random", minAge: 14, maxAge: 60, baseWeight: 6,
        condition: (p) => p.relationships.friends.length > 0,
        text: "친한 친구가 뒷담화를 했다는 소문을 들었습니다.",
        choices: [
            { id: "confront", text: "직접 따진다 (속은 시원하지만 사이는 틀어진다)", effects: { "relationship.friend": -20, "personality.confidence": 5, "base.stress": 5 } },
            { id: "slide", text: "그냥 넘어간다 (평화롭지만 앙금은 남는다)", effects: { "relationship.friend": -5, "base.stress": -2 } }
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
    }
]);
