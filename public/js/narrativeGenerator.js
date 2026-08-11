// GDD Ch.12 AI Narrative System — template stand-in.
// AI는 계산을 수행하지 않고 서버가 계산한 결과만 문장으로 표현한다(12.2).
// 리뷰 반영: "스탯이 오르는 시스템"처럼 느껴지지 않도록, 한 턴의 결과를
// 상황(event.text) -> 선택 -> 성격이 묻어나는 반응 -> 감정의 여운, 4박자로 구성한다.
// generate()의 입출력 형태는 12.4/12.6의 JSON 계약과 동일하게 맞춰 두어,
// 나중에 이 함수 내부만 실제 LLM 호출로 교체하면 되도록 설계했다.

const TONE_REFLECTIONS = {
    extroversion: ["평소처럼 사람들과 부대끼는 걸 마다하지 않았다.", "가만히 있질 못하는 성격이 여지없이 드러났다.", "혼자 삭이기보다는 부딪혀보는 쪽을 택했다."],
    empathy: ["다른 사람의 마음을 먼저 헤아리는 모습이었다.", "상대의 입장에서 한 번 더 생각해보게 됐다.", "누군가의 기분을 살피는 게 먼저였다."],
    responsibility: ["맡은 일은 확실히 해내야 직성이 풀렸다.", "책임감이 발동한 순간이었다.", "대충 넘어가는 법이 없는 성격다웠다."],
    aggression: ["거침없이 밀어붙이는 성격이 여실히 드러났다.", "물러서는 건 성미에 맞지 않았다.", "일단 부딪히고 보는 쪽이었다."],
    curiosity: ["호기심을 참지 못하는 성격다웠다.", "궁금한 건 일단 확인해봐야 직성이 풀렸다.", "새로운 것 앞에서 눈이 반짝였다."],
    confidence: ["망설임 없는 당당한 태도였다.", "스스로를 믿는 태도가 묻어났다.", "주저하지 않고 밀고 나갔다."],
    patience: ["서두르지 않고 차분히 임했다.", "조급해하지 않는 여유가 있었다.", "묵묵히 기다릴 줄 아는 성격이었다."],
    honesty: ["에두르지 않는 솔직한 태도였다.", "있는 그대로 말하고 행동하는 편이었다.", "돌려 말하는 법을 잘 모르는 성격이었다."]
};

const AFTERMATH_POOLS = {
    Positive: ["그날 이후 마음이 한결 가벼워졌다.", "작은 성취감이 오래도록 남았다.", "그 선택은 두고두고 잘한 일로 기억됐다.", "웃으며 돌아볼 수 있는 하루였다."],
    Negative: ["그 기억은 오래도록 마음 한 켠에 남았다.", "쉽게 잊히지 않는 하루였다.", "후회가 완전히 가시지는 않았다.", "그날 밤은 유독 뒤척이며 잠들었다."],
    Bittersweet: ["기쁨과 아쉬움이 뒤섞인 복잡한 감정이었다.", "완전히 맞는 선택인지는 지금도 알 수 없다.", "웃어야 할지 씁쓸해해야 할지 애매한 하루였다.", "얻은 것과 잃은 것이 함께 남았다."],
    Neutral: ["특별할 것 없는, 그러나 분명한 하루의 한 조각이었다.", "그렇게 또 하루가 지나갔다.", "일상은 별다른 동요 없이 흘러갔다.", "크게 달라진 건 없어 보였다."]
};

// GDD Ch.2.4 액션 타입별 결과 문구 — "무난히 해냈다" 하나로 퉁치지 않고 행동마다 결을 다르게 준다.
const ACTION_TIER_LINES = {
    Study: {
        CRIT_SUCCESS: ["머릿속에 안개가 걷히듯 이해가 확 트였다.", "오늘따라 공부가 유독 잘 붙었다."],
        SUCCESS: ["차근차근 진도를 따라갔다.", "무리 없이 오늘 분량을 마쳤다."],
        FAIL: ["집중이 자꾸 흐트러졌다.", "머리에 잘 들어오지 않는 하루였다."],
        CRIT_FAIL: ["책상 앞에 앉아만 있다 시간을 흘려보냈다.", "졸음을 이기지 못하고 엎드려 잠들고 말았다."]
    },
    Social: {
        CRIT_SUCCESS: ["대화가 유독 즐겁게 이어졌다.", "친구들 사이에서 웃음이 끊이지 않았다."],
        SUCCESS: ["가볍게 어울리며 시간을 보냈다.", "별 탈 없이 즐거운 시간이었다."],
        FAIL: ["묘하게 대화가 겉돌았다.", "함께 있어도 어색한 공기가 흘렀다."],
        CRIT_FAIL: ["사소한 말 한마디가 분위기를 싸늘하게 만들었다.", "괜히 나섰다가 민망해지고 말았다."]
    },
    Hobby: {
        CRIT_SUCCESS: ["몰입한 나머지 시간 가는 줄 몰랐다.", "생각보다 소질이 있다는 걸 새삼 느꼈다."],
        SUCCESS: ["오랜만에 온전히 나를 위한 시간이었다.", "소소하지만 만족스러운 시간이었다."],
        FAIL: ["마음처럼 손이 따라주지 않았다.", "집중이 잘 안 되는 날이었다."],
        CRIT_FAIL: ["엉망이 되어버려 실망만 남았다.", "괜히 시작했나 싶은 하루였다."]
    },
    Work: {
        CRIT_SUCCESS: ["평소보다 일이 술술 풀렸다.", "성과를 인정받는 순간이었다."],
        SUCCESS: ["묵묵히 맡은 몫을 해냈다.", "특별할 것 없이 하루치 일을 마쳤다."],
        FAIL: ["실수가 이어져 진땀을 뺐다.", "생각만큼 손이 따라주지 않았다."],
        CRIT_FAIL: ["큰 실수를 저질러 진땀을 흘렸다.", "일이 꼬이는 바람에 곤욕을 치렀다."]
    },
    Family: {
        CRIT_SUCCESS: ["오래도록 기억에 남을 다정한 시간이었다.", "가족 모두가 오랜만에 활짝 웃었다."],
        SUCCESS: ["별 것 아닌 대화에도 마음이 편안해졌다.", "함께 있는 것만으로 충분했다."],
        FAIL: ["말이 자꾸 어긋나며 겉돌았다.", "어색한 침묵이 흘렀다."],
        CRIT_FAIL: ["사소한 말다툼으로 번지고 말았다.", "괜히 서운한 말이 오갔다."]
    },
    Health: {
        CRIT_SUCCESS: ["몸이 한결 가벼워진 게 느껴졌다.", "컨디션이 눈에 띄게 좋아졌다."],
        SUCCESS: ["꾸준히 몸을 돌봤다.", "무리 없이 챙겨 넘겼다."],
        FAIL: ["생각만큼 효과가 크지 않았다.", "몸이 예전 같지 않다는 걸 느꼈다."],
        CRIT_FAIL: ["무리했는지 오히려 몸살이 났다.", "괜히 몸만 축나고 말았다."]
    },
    Finance: {
        CRIT_SUCCESS: ["예상보다 짭짤한 결과에 흐뭇해졌다.", "판단이 제대로 맞아떨어졌다."],
        SUCCESS: ["차곡차곡 형편이 나아졌다.", "무난하게 마무리됐다."],
        FAIL: ["기대만큼의 성과는 아니었다.", "생각보다 남는 게 없었다."],
        CRIT_FAIL: ["손해를 보고 말았다.", "괜한 짓을 했나 싶은 마음이 들었다."]
    },
    Romance: {
        CRIT_SUCCESS: ["설렘 가득한 순간이 오래 남았다.", "서로에게 스며드는 게 느껴지는 시간이었다."],
        SUCCESS: ["편안하고 다정한 시간을 보냈다.", "함께 있는 시간이 좋았다."],
        FAIL: ["어딘가 서먹한 기류가 흘렀다.", "말이 어긋나 서운함이 남았다."],
        CRIT_FAIL: ["사소한 오해가 크게 번지고 말았다.", "냉랭한 침묵만 오갔다."]
    },
    Rest: {
        CRIT_SUCCESS: ["오랜만에 푹 쉬며 완전히 재충전했다.", "머리가 맑아지는 게 느껴졌다."],
        SUCCESS: ["잠깐의 휴식이 도움이 됐다.", "숨 돌릴 틈이 생겼다."],
        FAIL: ["쉬어도 개운하지 않았다.", "생각이 많아 온전히 쉬지 못했다."],
        CRIT_FAIL: ["오히려 뒤숭숭한 마음만 남았다.", "쉬는 둥 마는 둥 시간만 흘렀다."]
    },
    Crime: {
        CRIT_SUCCESS: ["아무도 눈치채지 못한 채 넘어갔다.", "간담이 서늘했지만 결국 무사히 넘겼다."],
        SUCCESS: ["들키지 않고 넘어갔다.", "찜찜함을 안은 채 마무리됐다."],
        FAIL: ["누군가 수상하게 여기는 눈치였다.", "일이 틀어질 뻔했다."],
        CRIT_FAIL: ["결국 들통이 나고 말았다.", "돌이킬 수 없는 곤경에 빠졌다."]
    }
};

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// 선택지 버튼에 붙는 "(장점 vs 단점)" 힌트는 UI 도우미용이라, 서사 문장에는 넣지 않는다.
function stripHint(text) {
    return text.replace(/\s*\([^)]*\)\s*$/, "");
}

const NarrativeGenerator = {
    // 가장 두드러진 성격 특성을 문체 톤으로 반영한다.
    toneFor(player) {
        const p = player.stats.personality;
        const [topTrait] = Object.entries(p).sort((a, b) => b[1] - a[1])[0];
        return pick(TONE_REFLECTIONS[topTrait] || TONE_REFLECTIONS.responsibility);
    },

    // 이벤트 결과 서술 — 상황 -> 선택 -> 성격이 묻어나는 반응 -> 감정의 여운, 4박자 구성.
    describeEventOutcome(event, choice, player) {
        const emotion = this.inferEmotion(choice.effects);
        const situation = event.text;
        const decision = stripHint(choice.text);
        const reflection = this.toneFor(player);
        const aftermath = pick(AFTERMATH_POOLS[emotion] || AFTERMATH_POOLS.Neutral);
        const content = `${situation} ${decision}. ${reflection} ${aftermath}`;
        return { title: event.text.slice(0, 12), content, emotion };
    },

    // 행동 결과 서술 — 행동 유형마다 결이 다른 문장 + 수치 변화 요약.
    describeActionOutcome(action, result) {
        const lines = ACTION_TIER_LINES[action.type] || ACTION_TIER_LINES.Rest;
        const line = pick(lines[result.tier] || lines.SUCCESS);
        const summary = this.effectSummary(result.effects);
        return `${action.name} — ${line}${summary ? " " + summary : ""}`;
    },

    // 엔딩 시 인생 연대기 (Ch.9.6 AI Biography)
    generateBiography(summary) {
        const { name, age, career, majorEvents, ending } = summary;
        const openLine = `${name}은(는) ${summary.socialClass || "평범한"} 가정에서 태어났다.`;
        const careerLine = career ? `${career}(으)로서의 삶을 살았으며, ` : "";
        const eventsLine = majorEvents.length
            ? `${majorEvents.slice(0, 4).join(" ")} `
            : "";
        const endLine = ending === "NaturalDeath"
            ? `향년 ${age}세, 자연스럽게 생을 마감했다.`
            : `${age}세에 인생의 한 챕터를 마무리했다.`;
        return `${openLine} ${careerLine}${eventsLine}${endLine}`;
    },

    inferEmotion(effects) {
        const raw = typeof effects === "function" ? {} : (effects || {});
        const sum = Object.values(raw).reduce((s, v) => s + (typeof v === "number" ? v : 0), 0);
        if (sum > 8) return "Positive";
        if (sum < -8) return "Negative";
        if (sum === 0) return "Neutral";
        return "Bittersweet";
    },

    effectSummary(effects) {
        const parts = Object.entries(effects || {})
            .filter(([, v]) => typeof v === "number" && v !== 0)
            .map(([k, v]) => `${k.split(".").pop()} ${v > 0 ? "+" : ""}${v}`);
        return parts.length ? `(${parts.join(", ")})` : "";
    },

    // GDD 12.9 AI Failure Handling — 실패 시 템플릿 문장으로 대체
    fallbackTemplate() {
        const templates = [
            "당신은 올해 새로운 경험을 했다. 많은 어려움이 있었지만 인생은 계속된다.",
            "특별할 것 없는 하루하루가 쌓여 한 해가 지나갔다."
        ];
        return pick(templates);
    }
};
