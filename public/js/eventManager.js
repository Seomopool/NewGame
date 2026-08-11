// GDD Ch.5 Event System — selection follows Event Priority: Mandatory > Hidden/Conditional > Random.
// 최대 2 Events 발생 가능(5.2), 후보가 없으면 Fallback(Peaceful Year) 실행(5.5).
class EventManager {
    constructor(eventDatabase) {
        this.db = eventDatabase;
        this.seen = new Set();
        this.pendingChain = null; // { eventId, atAge }
    }

    getAvailableEvents(player, type) {
        return this.db.filter(e => {
            if (e.type !== type) return false;
            if (e.once && this.seen.has(e.id)) return false;
            if (player.age < e.minAge || player.age > e.maxAge) return false;
            if (e.condition && !e.condition(player)) return false;
            return true;
        });
    }

    // FinalWeight = BaseWeight + StatModifier + TraitModifier + RelationshipModifier + AgeModifier
    calculateWeight(event, player) {
        const modifier = event.weightModifiers ? event.weightModifiers(player) : 0;
        return Math.max(0, event.baseWeight + modifier);
    }

    weightedSelect(events, player) {
        const weighted = events.map(e => ({ event: e, weight: this.calculateWeight(e, player) }));
        const total = weighted.reduce((s, w) => s + w.weight, 0);
        if (total <= 0) return null;
        let roll = Math.random() * total;
        for (const w of weighted) {
            roll -= w.weight;
            if (roll <= 0) return w.event;
        }
        return weighted[weighted.length - 1].event;
    }

    fallbackEvent() {
        return {
            id: "FALLBACK_PEACEFUL",
            type: "Random",
            text: "올해는 특별한 사건 없이 평온한 한 해를 보냈다.",
            choices: [{ id: "ok", text: "다음으로", effects: {} }]
        };
    }

    // 매 턴 최대 2개의 이벤트를 선정한다.
    selectEventsForTurn(player) {
        const picked = [];

        if (this.pendingChain && this.pendingChain.atAge <= player.age) {
            const chainEvent = this.db.find(e => e.id === this.pendingChain.eventId);
            if (chainEvent) picked.push(chainEvent);
            this.pendingChain = null;
        }

        if (picked.length === 0) {
            const mandatory = this.getAvailableEvents(player, "Mandatory");
            if (mandatory.length > 0) picked.push(mandatory[0]);
        }

        if (picked.length < 2) {
            const pool = [
                ...this.getAvailableEvents(player, "Conditional"),
                ...this.getAvailableEvents(player, "Random"),
                ...this.getAvailableEvents(player, "Global")
            ].filter(e => !picked.includes(e));
            const chosen = this.weightedSelect(pool, player);
            if (chosen) picked.push(chosen);
        }

        if (picked.length === 0) picked.push(this.fallbackEvent());
        return picked;
    }

    executeChoice(event, choiceId) {
        this.seen.add(event.id);
        const choice = event.choices.find(c => c.id === choiceId) || event.choices[0];
        if (choice.nextEvent) {
            this.pendingChain = { eventId: choice.nextEvent.id, atAge: choice.nextEvent.atAge };
        }
        return choice;
    }
}
