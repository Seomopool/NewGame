// GDD Ch.3 Parent System — procedurally rolls country -> family -> parents ->
// genetics -> wealth -> environment, matching the 3.13 Development Method flow.
function weightedPick(list, probKey = "probability") {
    const total = list.reduce((s, x) => s + x[probKey], 0);
    let roll = Math.random() * total;
    for (const item of list) {
        roll -= item[probKey];
        if (roll <= 0) return item;
    }
    return list[list.length - 1];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rollParentStats() {
    return {
        intelligence: randomInt(20, 95),
        health: randomInt(30, 95),
        charm: randomInt(20, 95),
        discipline: randomInt(10, 95),
        stress: randomInt(10, 90)
    };
}

function pickName(exclude) {
    const pool = GDD.NAME_POOL.filter(n => n !== exclude);
    return pool[randomInt(0, pool.length - 1)];
}

const ParentSystem = {
    CountryGenerator: () => weightedPick(GDD.COUNTRIES.map(c => ({ ...c, probability: 1 }))),
    FamilyGenerator: () => weightedPick(GDD.FAMILY_TYPES),
    SocialClassGenerator: () => weightedPick(GDD.SOCIAL_CLASSES),
    OccupationGenerator: () => weightedPick(GDD.PARENT_OCCUPATIONS.map(o => ({ ...o, probability: o.wealthTier + 1 }))),
    ParentingStyleGenerator: () => GDD.PARENTING_STYLES[randomInt(0, GDD.PARENTING_STYLES.length - 1)],
    EnvironmentGenerator: () => GDD.ENVIRONMENTS[randomInt(0, GDD.ENVIRONMENTS.length - 1)],
    DestinyGenerator: () => GDD.DESTINIES[randomInt(0, GDD.DESTINIES.length - 1)],

    // 오프닝 연출용 출생 시각 — 실제 달력과 무관한 게임 내 임의 시점이다.
    BirthMomentGenerator() {
        return {
            year: randomInt(1990, 2015), month: randomInt(1, 12), day: randomInt(1, 28),
            hour: randomInt(0, 23), minute: randomInt(0, 59),
            hospital: GDD.HOSPITAL_NAMES[randomInt(0, GDD.HOSPITAL_NAMES.length - 1)]
        };
    },

    ParentGenerator() {
        const fatherName = pickName();
        return {
            father: { ...rollParentStats(), occupation: this.OccupationGenerator(), name: fatherName },
            mother: { ...rollParentStats(), occupation: this.OccupationGenerator(), name: pickName(fatherName) }
        };
    },

    // GDD 3.9 Genetics System: Player = Father*40% + Mother*40% + Mutation(-20~20)
    GeneticCalculator(father, mother) {
        const mutation = () => randomInt(-20, 20);
        const inherit = (key) => Math.round(father[key] * 0.4 + mother[key] * 0.4 + mutation());
        return {
            intelligence: Math.max(0, Math.min(100, inherit("intelligence"))),
            health: Math.max(0, Math.min(100, inherit("health"))),
            charm: Math.max(0, Math.min(100, inherit("charm")))
        };
    },

    // GDD 3.10 Initial Wealth = SocialClass + ParentOccupation + Luck
    WealthCalculator(socialClass, occupationFather, occupationMother) {
        const [min, max] = socialClass.wealthRange;
        const occupationBonus = (occupationFather.wealthTier + occupationMother.wealthTier) * 2;
        const luck = randomInt(-5, 5);
        return Math.max(0, Math.min(100, randomInt(min, max) + occupationBonus + luck));
    },

    // GDD 3.12 Birth Event — AI 서술용 입력 데이터만 준비 (계산은 시스템이 완료)
    BirthEventGenerator(genesis) {
        return {
            country: genesis.country.name,
            familyType: genesis.familyType.name,
            socialClass: genesis.socialClass.name,
            parentingStyle: genesis.parentingStyle.name,
            environment: genesis.environment
        };
    },

    // 전체 파이프라인 (Ch.3.2 Parent Generation Flow)
    generate() {
        const country = this.CountryGenerator();
        const environment = this.EnvironmentGenerator();
        const familyType = this.FamilyGenerator();
        const socialClass = this.SocialClassGenerator();
        const { father, mother } = this.ParentGenerator();
        const parentingStyle = this.ParentingStyleGenerator();
        const genetics = this.GeneticCalculator(father, mother);
        const wealth = this.WealthCalculator(socialClass, father.occupation, mother.occupation);
        const destiny = this.DestinyGenerator();
        const birthMoment = this.BirthMomentGenerator();

        const genesis = { country, environment, familyType, socialClass, father, mother, parentingStyle, genetics, wealth, destiny, birthMoment };
        genesis.birthEventInput = this.BirthEventGenerator(genesis);
        return genesis;
    }
};
