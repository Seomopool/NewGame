// GDD Ch.5 Event DB — 나이/조건에 따라 반드시 발생하는 필수 이벤트.
// 여러 파일이 같은 배열에 이어붙는 구조라 순서와 무관하게 안전하게 확장 가능하다.
window.GDD_EVENTS = (window.GDD_EVENTS || []).concat([
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
    }
]);
