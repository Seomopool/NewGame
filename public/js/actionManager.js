// GDD Ch.2.4 Action Point System
class ActionManager {
    // Max AP = Clamp(3 + floor(Health/30) - floor(Stress/40), 1, 6)
    calculateMaxAP(stats) {
        const healthBonus = Math.floor(stats.base.health / 30);
        const stressPenalty = Math.floor(stats.base.stress / 40);
        return Math.max(1, Math.min(6, 3 + healthBonus - stressPenalty));
    }

    // player 전체를 받아야 propose처럼 관계 상태에 의존하는 전제조건도 서버(로직) 단에서
    // 검증할 수 있다 — UI에서만 숨기는 방식은 GDD 13.3 Server Authority 원칙에 어긋난다.
    getAvailableActions(player) {
        return GDD.ACTIONS.filter(a => {
            if (!a.stages.includes(player.lifeStage.key)) return false;
            if (a.requiresJob && !player.job) return false;
            if (a.requiresNoJob && player.job) return false;
            if (a.requiresUnmarried && player.family.married) return false;
            if (a.requiresLoverAffinity) {
                const lover = player.relationships.lover;
                if (!lover || lover.affinity < a.requiresLoverAffinity) return false;
            }
            return true;
        });
    }

    // 대성공/성공/실패/대실패 판정
    executeAction(action, stats) {
        const relevant = action.successStats.length
            ? action.successStats.reduce((sum, s) => sum + (stats.base[s] ?? stats.personality[s] ?? 50), 0) / action.successStats.length
            : 50;
        const successRate = Math.max(5, Math.min(95, action.baseRate + (relevant - 50) * 0.5 + (stats.hidden.luck - 50) * 0.1));
        const roll = Math.random() * 100;

        let tier;
        if (roll < successRate * 0.15) tier = "CRIT_SUCCESS";
        else if (roll < successRate) tier = "SUCCESS";
        else if (roll < successRate + (100 - successRate) * 0.7) tier = "FAIL";
        else tier = "CRIT_FAIL";

        return this.resolveResult(action, tier);
    }

    resolveResult(action, tier) {
        const multiplier = { CRIT_SUCCESS: 1.8, SUCCESS: 1.0, FAIL: 0.25, CRIT_FAIL: -1.0 }[tier];
        const effects = {};
        for (const key in action.effects) {
            effects[key] = Math.round(action.effects[key] * multiplier * 10) / 10;
        }
        return { tier, effects };
    }
}
