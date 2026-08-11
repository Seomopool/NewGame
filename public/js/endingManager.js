// GDD Ch.9 Ending & Legacy System
class EndingManager {
    // Ch.9.2 Ending Trigger
    checkEndingTrigger(player) {
        if (player.stats.base.health <= 0) return { type: "NaturalDeath", reason: "건강 악화" };
        if (player.age >= 100) return { type: "NaturalDeath", reason: "노환" };
        if (player.crimeCount >= 5 && player.stats.hidden.karma <= -60) return { type: "Forced", reason: "무기징역" };
        if (player.stats.base.mental <= 0) return { type: "Forced", reason: "정신 붕괴" };
        if (player.wantsToEnd) return { type: "Voluntary", reason: player.retired ? "은퇴 선언" : "이 인생을 마무리한다" };
        return null;
    }

    updateCareerScore(player) {
        if (!player.job) return;
        const score = Math.max(0, Math.min(100, player.job.level * 15 + player.job.salary / 2000));
        player.stats.derived.career = Math.max(player.stats.derived.career, score);
    }

    // Ch.9.3 Overall Life Score
    calculateLifeScore(player) {
        const detail = {
            wealth: player.stats.base.wealth,
            career: player.stats.derived.career,
            family: player.stats.derived.family,
            relationship: player.stats.derived.relationship,
            health: player.stats.base.health,
            happiness: player.stats.base.happiness,
            fame: player.stats.hidden.fame,
            contribution: Math.max(0, Math.min(100, (player.stats.hidden.karma + player.stats.hidden.reputation) / 2))
        };
        const weights = GDD.LIFE_SCORE_WEIGHTS;
        let total = 0;
        for (const key in weights) total += detail[key] * weights[key];
        return { total: Math.round(Math.max(0, Math.min(100, total))), detail };
    }

    determineRank(score) {
        return (GDD.ENDING_RANKS.find(r => score >= r.min) || GDD.ENDING_RANKS[GDD.ENDING_RANKS.length - 1]).rank;
    }

    assignTitles(player) {
        return GDD.TITLES.filter(t => t.check(player)).map(t => t.name);
    }

    generateGravestone(player, lifeScore, titles) {
        return {
            name: "플레이어",
            birthYear: player.genesis.birthMoment.year,
            deathYear: player.genesis.birthMoment.year + player.age,
            deathAge: player.age,
            job: player.job?.name || player.careerHistory[player.careerHistory.length - 1]?.job || "무직",
            lifeScore: lifeScore.total,
            title: titles[0] || "평범한 삶"
        };
    }

    // Ch.9.8 Development Method Flow
    buildResult(player, trigger) {
        this.updateCareerScore(player);
        const lifeScore = this.calculateLifeScore(player);
        const rank = this.determineRank(lifeScore.total);
        const titles = this.assignTitles(player);
        const biography = NarrativeGenerator.generateBiography({
            name: "당신",
            age: player.age,
            career: player.job?.name || player.careerHistory[player.careerHistory.length - 1]?.job,
            majorEvents: player.timeline.slice(1).slice(-6).map(t => `${t.age}세 ${t.text}`),
            ending: trigger.type,
            socialClass: player.genesis.socialClass.name
        });
        const gravestone = this.generateGravestone(player, lifeScore, titles);

        return {
            endingType: trigger.type,
            reason: trigger.reason,
            lifeScore,
            rank,
            titles,
            biography,
            gravestone
        };
    }
}
