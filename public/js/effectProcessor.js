// 선택/행동 effects 적용을 game.js에서 분리한 전용 처리기.
// 새 특수 효과가 필요할 때는 if 분기를 늘리는 대신 handlers 맵에 한 줄만 추가하면 된다.
class EffectProcessor {
    constructor(jobManager, relationshipManager) {
        this.jobManager = jobManager;
        this.relationshipManager = relationshipManager;
        this.handlers = this.buildHandlers();
    }

    buildHandlers() {
        return {
            "education.enrolled": (player, value) => { player.education.enrolled = value; },
            "education.highestCompleted": (player, value) => { player.education.highestCompleted = value; },
            "job.retire": (player, value) => {
                if (!value) return;
                this.jobManager.processRetirement(player);
                player.wantsToEnd = true;
            },
            "job.raise": (player, value) => {
                if (!value || !player.job) return;
                player.job.level += 1;
                player.job.salary = this.jobManager.calculateSalary(player.job);
                player.timeline.push({ age: player.age, text: `${player.job.name} 이직/연봉 협상 성공 (Lv.${player.job.level})` });
            },
            "married": (player, value) => {
                if (!value) return;
                player.family.married = true;
                player.stats.increase("derived", "family", 15);
            },
            "children": (player, value) => {
                player.family.children += value;
                player.stats.increase("derived", "family", 10 * value);
            },
            "relationship.parents": (player, value) => this.relationshipManager.adjustParents(player.relationships, value),
            "relationship.friend": (player, value) => this.relationshipManager.adjustFriend(player.relationships, value),
            "relationship.lover": (player, value) => this.relationshipManager.adjustLover(player.relationships, value),
            "relationship.loverBreakup": (player, value) => { if (value) player.relationships.lover = null; }
        };
    }

    // 반환값은 UI가 아이콘 칩으로 보여줄 "실제 적용된 수치 변화"만 담는다.
    apply(player, effects) {
        const deltas = {};
        for (const key in effects) {
            const value = effects[key];

            if (this.handlers[key]) { this.handlers[key](player, value); continue; }
            if (key.startsWith("tag.")) { if (value) player.tags[key.slice(4)] = { age: player.age }; continue; }
            if (typeof value !== "number") continue;

            const group = this.resolveStatGroup(player, key);
            if (!group) continue;
            player.stats.applyStatGain(group.name, group.stat, value);
            deltas[group.stat] = (deltas[group.stat] || 0) + value;
        }
        return deltas;
    }

    // "group.stat" 점 표기(이벤트)와 "stat"만 있는 평평한 표기(GDD.ACTIONS) 둘 다 지원한다.
    resolveStatGroup(player, key) {
        if (key.includes(".")) {
            const [name, stat] = key.split(".");
            return player.stats[name] && stat in player.stats[name] ? { name, stat } : null;
        }
        const name = ["base", "personality", "hidden", "derived"].find(g => key in player.stats[g]);
        return name ? { name, stat: key } : null;
    }
}
