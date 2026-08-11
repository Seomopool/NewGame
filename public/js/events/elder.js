// GDD Ch.5 Event DB — 노년기(60+) 전용 이벤트. (손주/황혼로맨스는 family.js·romance.js에도 있음)
window.GDD_EVENTS = (window.GDD_EVENTS || []).concat([
    {
        id: "EVT_LIFE_REFLECTION", type: "Random", minAge: 60, maxAge: 130, baseWeight: 8,
        text: "지난 삶을 돌아보게 되는 밤이었습니다.",
        choices: [
            { id: "content", text: "그럭저럭 만족스러운 삶이었다고 생각한다", effects: { "base.happiness": 8 } },
            { id: "regret", text: "이루지 못한 것들이 자꾸 떠오른다", effects: { "base.stress": 5, "base.happiness": -5 } }
        ]
    }
]);
