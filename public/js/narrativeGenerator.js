// GDD Ch.12 AI Narrative System — template stand-in.
// AI는 계산을 수행하지 않고 서버가 계산한 결과만 문장으로 표현한다(12.2).
// generate()의 입출력 형태는 12.4/12.6의 JSON 계약과 동일하게 맞춰 두어,
// 나중에 이 함수 내부만 실제 LLM 호출로 교체하면 되도록 설계했다.
const TONE_PHRASES = {
    extroversion: "활기차게", empathy: "따뜻한 마음으로", responsibility: "책임감 있게",
    aggression: "거침없이", curiosity: "호기심 어린 눈으로", confidence: "당당하게",
    patience: "차분하게", honesty: "솔직하게"
};

const NarrativeGenerator = {
    // 가장 두드러진 성격 특성을 문체 톤으로 반영한다 (3순위: 성격 → AI 문체).
    toneFor(player) {
        const p = player.stats.personality;
        const [topTrait] = Object.entries(p).sort((a, b) => b[1] - a[1])[0];
        return TONE_PHRASES[topTrait] || "";
    },

    // 이벤트 결과 서술 (Ch.12.3 Event Narrative) — 스탯 수치는 UI가 따로 보여주므로
    // 여기서는 수치를 나열하지 않고 순수한 서사 문장만 만든다.
    describeEventOutcome(event, choice, player) {
        const emotion = this.inferEmotion(choice.effects);
        const tone = this.toneFor(player);
        const content = `${event.text} ${tone} ${choice.text}.`;
        return { title: event.text.slice(0, 12), content, emotion };
    },

    // 행동 결과 서술 (턴 종료 시 Year Summary -> 한 문단)
    describeActionOutcome(action, result) {
        const tierText = {
            CRIT_SUCCESS: "기대 이상의 성과를 거두었다",
            SUCCESS: "무난히 해냈다",
            FAIL: "생각만큼 잘 되지 않았다",
            CRIT_FAIL: "크게 어긋나고 말았다"
        }[result.tier];
        const summary = this.effectSummary(result.effects);
        return `${action.name}: ${tierText}.${summary ? " " + summary : ""}`;
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
        const sum = Object.values(effects || {}).reduce((s, v) => s + (typeof v === "number" ? v : 0), 0);
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
        return templates[Math.floor(Math.random() * templates.length)];
    }
};
