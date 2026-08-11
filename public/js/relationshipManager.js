// 3순위 개선: 이름을 가진 NPC 관계 시스템.
// 이벤트/행동 결과가 특정 인물과의 친밀도로 쌓여, 이후 조건부 이벤트(Ch.5 예시:
// "부모와 친밀도 70 이상")가 이를 참조할 수 있게 한다.
class RelationshipManager {
    createInitial(genesis) {
        return {
            mother: { name: genesis.mother.name, role: "어머니", affinity: 60 },
            father: { name: genesis.father.name, role: "아버지", affinity: 60 },
            friends: [],
            lover: null
        };
    }

    clamp(v) {
        return Math.max(0, Math.min(100, Math.round(v)));
    }

    adjustParents(rel, delta) {
        rel.mother.affinity = this.clamp(rel.mother.affinity + delta);
        rel.father.affinity = this.clamp(rel.father.affinity + delta);
    }

    // 처음 한두 번은 새 친구를 만들고, 이후로는 최대 인원 내에서 기존 친구와 친밀도를 쌓는다.
    getOrCreateFriend(rel) {
        const MAX_FRIENDS = 4;
        if (rel.friends.length < 1 || (rel.friends.length < MAX_FRIENDS && Math.random() < 0.15)) {
            const usedNames = rel.friends.map(f => f.name).concat(rel.mother.name, rel.father.name);
            const name = GDD.NAME_POOL.find(n => !usedNames.includes(n));
            const friend = { name, affinity: 50 };
            rel.friends.push(friend);
            return friend;
        }
        return rel.friends[Math.floor(Math.random() * rel.friends.length)];
    }

    adjustFriend(rel, delta) {
        const friend = this.getOrCreateFriend(rel);
        friend.affinity = this.clamp(friend.affinity + delta);
        return friend;
    }

    // 연인이 없으면 새로 생기고, 있으면 친밀도가 쌓인다.
    adjustLover(rel, delta) {
        if (!rel.lover) {
            const usedNames = rel.friends.map(f => f.name).concat(rel.mother.name, rel.father.name);
            const name = GDD.NAME_POOL.find(n => !usedNames.includes(n));
            rel.lover = { name, affinity: 55 };
            return rel.lover;
        }
        rel.lover.affinity = this.clamp(rel.lover.affinity + delta);
        return rel.lover;
    }
}
