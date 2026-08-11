// GDD Ch.4 Player Stat System — all stat mutation must go through StatManager
// (다른 시스템은 직접 수치를 변경하지 않고 StatManager API를 호출하도록 설계).
class StatManager {
    constructor() {
        this.base = {
            health: 70, intelligence: 50, charm: 50, creativity: 50,
            mental: 60, stress: 15, happiness: 60, wealth: 10
        };
        this.personality = {
            extroversion: 50, empathy: 50, responsibility: 50, aggression: 20,
            curiosity: 50, confidence: 50, patience: 50, honesty: 50
        };
        // UI에서는 직접 노출되지 않음 (Ch.4.5 Hidden Stat 접근 제한)
        this.hidden = {
            karma: 0, morality: 0, reputation: 0, fame: 0, trauma: 0, luck: 50
        };
        // Ch.9 Life Score 산정을 위한 누적/파생 수치
        this.derived = { relationship: 50, family: 50, career: 0, contribution: 0 };
    }

    increase(group, stat, value) {
        if (!this[group] || !(stat in this[group]) || !value) return;
        this[group][stat] += value;
        this.clampAll();
    }

    decrease(group, stat, value) {
        this.increase(group, stat, -Math.abs(value));
    }

    // GDD 4.3 ⑤ 행복 계산 — 매년 다시 계산되는 종합 지표
    calculateHappiness() {
        const b = this.base;
        const value = 0.25 * b.health + 0.20 * b.wealth + 0.20 * this.derived.relationship +
            0.20 * b.mental - 0.15 * b.stress;
        this.base.happiness = Number.isFinite(value) ? this.clamp(value) : 50; // NaN fallback
        return this.base.happiness;
    }

    // GDD 4.3 ② 자연 감소 — 매년 자동 변화
    applyYearlyDecay(age) {
        this.base.health -= age * 0.03;
        this.base.stress += 0; // workload 기반 페널티는 JobManager에서 별도 적용
        this.calculateHappiness();
        this.clampAll();
    }

    // GDD 4.3 ③ 성장 한계 (Soft Cap) — 80 이상부터 성장 효율 감소
    softCapGain(baseGain, currentStat) {
        return baseGain * (1 - currentStat / 150);
    }

    applyStatGain(group, stat, baseGain) {
        if (baseGain === 0) return;
        const current = this[group][stat];
        const gain = baseGain > 0 ? this.softCapGain(baseGain, current) : baseGain;
        this.increase(group, stat, gain);
    }

    clamp(v, min = 0, max = 100) {
        if (Number.isNaN(v)) return 50;
        return Math.max(min, Math.min(max, v));
    }

    clampAll() {
        for (const g of [this.base, this.personality, this.hidden, this.derived]) {
            for (const k in g) g[k] = Math.round(this.clamp(g[k]) * 10) / 10;
        }
    }
}
