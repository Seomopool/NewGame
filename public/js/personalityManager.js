// GDD Ch.6 Personality & Trait System
const TRAIT_DB = [
    { id: "BOOKWORM", name: "독서광", opposite: null, check: (p) => p.habits.study >= 30, effects: { intelligence: 5 } },
    { id: "LEADER", name: "리더", opposite: null, check: (p) => p.stats.personality.confidence >= 80 && p.stats.hidden.reputation >= 60, effects: { charm: 5 } },
    { id: "OPTIMIST", name: "낙천주의자", opposite: "PESSIMIST", check: (p) => p.stats.base.happiness >= 80 },
    { id: "PESSIMIST", name: "비관주의자", opposite: "OPTIMIST", check: (p) => p.stats.base.stress >= 80 },
    { id: "HONEST", name: "정직한", opposite: "CROOK", check: (p) => p.stats.personality.honesty >= 85 },
    { id: "CROOK", name: "사기꾼", opposite: "HONEST", check: (p) => p.stats.personality.honesty <= 15 },
    { id: "PACIFIST", name: "평화주의자", opposite: "VIOLENT", check: (p) => p.stats.personality.aggression <= 10 },
    { id: "VIOLENT", name: "폭력배", opposite: "PACIFIST", check: (p) => p.stats.personality.aggression >= 85 },
    { id: "ATHLETIC", name: "운동신경", opposite: null, check: (p) => p.habits.exercise >= 30, effects: { health: 5 } },
    { id: "WORKAHOLIC", name: "워커홀릭", opposite: null, check: (p) => p.habits.work >= 30, effects: { wealth: 3, stress: 5 } }
];

class PersonalityManager {
    updateHabits(player, actionId) {
        player.habits[actionId] = (player.habits[actionId] || 0) + 1;
    }

    updateTraits(player) {
        for (const trait of TRAIT_DB) {
            if (player.traits.includes(trait.id)) continue;
            if (!trait.check(player)) continue;
            if (trait.opposite && player.traits.includes(trait.opposite)) {
                player.traits = player.traits.filter(t => t !== trait.opposite);
            }
            player.traits.push(trait.id);
            if (trait.effects) {
                for (const stat in trait.effects) player.stats.increase("base", stat, trait.effects[stat]);
            }
            player.log.push(`특성 획득: ${trait.name}`);
        }
    }

    // GDD 6.3 성격 자연 변화 — 성인 이후 공격성 점차 감소
    yearlyAdjustment(player) {
        if (player.age >= 19) {
            player.stats.decrease("personality", "aggression", player.age * 0.02);
        }
    }
}
