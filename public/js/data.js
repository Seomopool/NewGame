// GDD Ch.2/3/7/8/9 static reference tables. Kept as plain arrays/objects so
// new entries can be appended without touching manager logic (GDD 확장성 원칙).
window.GDD = window.GDD || {};

GDD.LIFE_STAGES = [
    { key: "INFANT", name: "영유아기", minAge: 0, maxAge: 6, turnsPerYear: 2 },
    { key: "CHILD", name: "아동기", minAge: 7, maxAge: 12, turnsPerYear: 4 },
    { key: "TEEN", name: "청소년기", minAge: 13, maxAge: 18, turnsPerYear: 6 },
    { key: "ADULT", name: "성인기", minAge: 19, maxAge: 39, turnsPerYear: 4 },
    { key: "MIDDLE", name: "중년기", minAge: 40, maxAge: 59, turnsPerYear: 4 },
    { key: "SENIOR", name: "노년기", minAge: 60, maxAge: 130, turnsPerYear: 2 }
];

GDD.COUNTRIES = [
    { id: "KOREA", name: "대한민국", modifiers: { intelligence: 3, stress: 5 } },
    { id: "USA", name: "미국", modifiers: { confidence: 3, wealthVariance: 10 } },
    { id: "JAPAN", name: "일본", modifiers: { responsibility: 3, mental: 3 } },
    { id: "GERMANY", name: "독일", modifiers: { health: 3, stress: -3 } },
    { id: "INDIA", name: "인도", modifiers: { eventRate: 1.15 } }
];

GDD.FAMILY_TYPES = [
    { id: "NUCLEAR", name: "양친 가정", probability: 78 },
    { id: "SINGLE_MOTHER", name: "한부모(모)", probability: 8 },
    { id: "SINGLE_FATHER", name: "한부모(부)", probability: 4 },
    { id: "GRANDPARENTS", name: "조부모 양육", probability: 4 },
    { id: "ADOPTION", name: "입양 가정", probability: 3 },
    { id: "ORPHANAGE", name: "보육 시설", probability: 2 },
    { id: "FOSTER", name: "위탁 가정", probability: 1 }
];

GDD.SOCIAL_CLASSES = [
    { id: "UPPER", name: "상류층", probability: 5, wealthRange: [70, 100], effects: { stress: 10 } },
    { id: "UPPER_MIDDLE", name: "중상류층", probability: 15, wealthRange: [45, 70] },
    { id: "MIDDLE", name: "중산층", probability: 35, wealthRange: [25, 45] },
    { id: "WORKING", name: "서민층", probability: 30, wealthRange: [10, 25] },
    { id: "LOWER", name: "저소득층", probability: 15, wealthRange: [0, 10], effects: { responsibility: 5 } }
];

GDD.PARENTING_STYLES = [
    { id: "AUTHORITATIVE", name: "민주적", effects: { happiness: 1, confidence: 1 } },
    { id: "AUTHORITARIAN", name: "권위주의", effects: { responsibility: 1, stress: 1 } },
    { id: "PERMISSIVE", name: "허용형", effects: { extroversion: 1, responsibility: -1 } },
    { id: "NEGLECTFUL", name: "방임형", effects: { curiosity: 1, empathy: -1 } }
];

GDD.PARENT_OCCUPATIONS = [
    { id: "DOCTOR", name: "의사", wealthTier: 3, educationBoost: 3 },
    { id: "TEACHER", name: "교사", wealthTier: 2, educationBoost: 3 },
    { id: "CIVIL_SERVANT", name: "공무원", wealthTier: 2, educationBoost: 1 },
    { id: "OFFICE_WORKER", name: "회사원", wealthTier: 2, educationBoost: 1 },
    { id: "DEVELOPER", name: "개발자", wealthTier: 3, educationBoost: 2 },
    { id: "SOLDIER", name: "군인", wealthTier: 1, educationBoost: 1 },
    { id: "ARTIST", name: "예술가", wealthTier: 1, educationBoost: 2 },
    { id: "FARMER", name: "농부", wealthTier: 1, educationBoost: 0 },
    { id: "SELF_EMPLOYED", name: "자영업", wealthTier: 2, educationBoost: 0 },
    { id: "UNEMPLOYED", name: "무직", wealthTier: 0, educationBoost: 0 }
];

GDD.ENVIRONMENTS = ["도시", "시골", "농촌", "해안", "산간", "해외"];

// GDD 2.4 Action Point System
GDD.ACTIONS = [
    { id: "study", name: "공부하기", type: "Study", cost: 1, stages: ["CHILD", "TEEN", "ADULT"], successStats: ["intelligence", "responsibility"], baseRate: 65, effects: { intelligence: 4, stress: 3 } },
    { id: "hangout", name: "친구와 어울리기", type: "Social", cost: 1, stages: ["CHILD", "TEEN", "ADULT", "MIDDLE"], successStats: ["extroversion", "charm"], baseRate: 70, effects: { relationship: 5, happiness: 3 } },
    { id: "hobby", name: "취미 즐기기", type: "Hobby", cost: 1, stages: ["INFANT", "CHILD", "TEEN", "ADULT", "MIDDLE", "SENIOR"], successStats: ["creativity"], baseRate: 75, effects: { happiness: 5, creativity: 2 } },
    { id: "parttime", name: "아르바이트", type: "Work", cost: 2, stages: ["TEEN", "ADULT"], successStats: ["responsibility"], baseRate: 65, effects: { wealth: 6, stress: 4 } },
    { id: "work", name: "직장에서 열심히 일하기", type: "Work", cost: 2, stages: ["ADULT", "MIDDLE"], requiresJob: true, successStats: ["intelligence", "responsibility"], baseRate: 60, effects: { stress: 6 } },
    { id: "seekJob", name: "구직 활동", type: "Work", cost: 2, stages: ["ADULT", "MIDDLE"], requiresNoJob: true, special: "employment" },
    { id: "family", name: "가족과 시간 보내기", type: "Family", cost: 1, stages: ["INFANT", "CHILD", "TEEN", "ADULT", "MIDDLE", "SENIOR"], successStats: ["empathy"], baseRate: 80, effects: { relationship: 4, happiness: 3, family: 4 } },
    { id: "exercise", name: "운동하기", type: "Health", cost: 1, stages: ["CHILD", "TEEN", "ADULT", "MIDDLE", "SENIOR"], successStats: ["responsibility"], baseRate: 80, effects: { health: 5, stress: -3 } },
    { id: "checkup", name: "병원 가기", type: "Health", cost: 1, stages: ["ADULT", "MIDDLE", "SENIOR"], cost_money: 10, successStats: [], baseRate: 90, effects: { health: 8, wealth: -5 } },
    { id: "invest", name: "저축/투자하기", type: "Finance", cost: 1, stages: ["ADULT", "MIDDLE", "SENIOR"], successStats: ["intelligence"], baseRate: 55, effects: { wealth: 8, stress: 2 } },
    { id: "romance", name: "연애하기", type: "Romance", cost: 2, stages: ["TEEN", "ADULT", "MIDDLE"], successStats: ["charm"], baseRate: 55, effects: { relationship: 8, happiness: 5 } },
    { id: "rest", name: "휴식하기", type: "Rest", cost: 1, stages: ["INFANT", "CHILD", "TEEN", "ADULT", "MIDDLE", "SENIOR"], successStats: [], baseRate: 95, effects: { stress: -8, happiness: 2, health: 2 } },
    { id: "crime", name: "위험한 일탈", type: "Crime", cost: 1, stages: ["TEEN", "ADULT", "MIDDLE"], successStats: ["confidence"], baseRate: 40, effects: { wealth: 15, karma: -15, stress: 5 } }
];

// GDD Ch.7 Education
GDD.EDUCATION_STAGES = [
    { key: "KINDERGARTEN", name: "유치원", minAge: 5, maxAge: 6 },
    { key: "ELEMENTARY", name: "초등학교", minAge: 7, maxAge: 12 },
    { key: "MIDDLE_SCHOOL", name: "중학교", minAge: 13, maxAge: 15 },
    { key: "HIGH_SCHOOL", name: "고등학교", minAge: 16, maxAge: 18 },
    { key: "UNIVERSITY", name: "대학교", minAge: 19, maxAge: 23 },
    { key: "GRADUATED", name: "졸업", minAge: 24, maxAge: 999 }
];

GDD.MAJORS = [
    { id: "CS", name: "컴퓨터공학", jobBoost: ["DEVELOPER"] },
    { id: "MEDICINE", name: "의학", jobBoost: ["DOCTOR"] },
    { id: "LAW", name: "법학", jobBoost: ["LAWYER"] },
    { id: "BUSINESS", name: "경영학", jobBoost: ["OFFICE_WORKER", "ENTREPRENEUR"] },
    { id: "ART", name: "예술", jobBoost: ["ARTIST"] },
    { id: "PE", name: "체육", jobBoost: ["ATHLETE"] }
];

// GDD Ch.8 Job System
GDD.JOBS = [
    { id: "DEVELOPER", name: "개발자", category: "Company", baseSalary: 50000, stress: 55, growth: 85, requiredEducation: "UNIVERSITY" },
    { id: "DESIGNER", name: "디자이너", category: "Company", baseSalary: 40000, stress: 45, growth: 70, requiredEducation: "UNIVERSITY" },
    { id: "MARKETER", name: "마케터", category: "Company", baseSalary: 38000, stress: 50, growth: 65, requiredEducation: "UNIVERSITY" },
    { id: "DOCTOR", name: "의사", category: "Professional", baseSalary: 90000, stress: 75, growth: 90, requiredEducation: "UNIVERSITY" },
    { id: "LAWYER", name: "변호사", category: "Professional", baseSalary: 85000, stress: 70, growth: 88, requiredEducation: "UNIVERSITY" },
    { id: "PROFESSOR", name: "교수", category: "Professional", baseSalary: 60000, stress: 40, growth: 60, requiredEducation: "UNIVERSITY" },
    { id: "POLICE", name: "경찰", category: "Public", baseSalary: 42000, stress: 55, growth: 40, requiredEducation: "HIGH_SCHOOL" },
    { id: "CIVIL_SERVANT", name: "공무원", category: "Public", baseSalary: 40000, stress: 35, growth: 35, requiredEducation: "HIGH_SCHOOL" },
    { id: "TEACHER", name: "교사", category: "Public", baseSalary: 43000, stress: 45, growth: 45, requiredEducation: "UNIVERSITY" },
    { id: "CAFE_OWNER", name: "카페 사장", category: "SelfEmployed", baseSalary: 35000, stress: 60, growth: 50, requiredEducation: "HIGH_SCHOOL" },
    { id: "SHOP_OWNER", name: "쇼핑몰 사장", category: "SelfEmployed", baseSalary: 33000, stress: 55, growth: 55, requiredEducation: "HIGH_SCHOOL" },
    { id: "STARTUP_FOUNDER", name: "스타트업 창업자", category: "Entrepreneur", baseSalary: 20000, stress: 85, growth: 120, requiredEducation: "HIGH_SCHOOL" },
    { id: "WRITER", name: "작가", category: "Freelancer", baseSalary: 25000, stress: 50, growth: 60, requiredEducation: "HIGH_SCHOOL" },
    { id: "STREAMER", name: "스트리머", category: "Freelancer", baseSalary: 22000, stress: 55, growth: 70, requiredEducation: "HIGH_SCHOOL" },
    { id: "ATHLETE", name: "프로게이머/운동선수", category: "Freelancer", baseSalary: 30000, stress: 65, growth: 75, requiredEducation: "HIGH_SCHOOL" }
];

// GDD Ch.9.5 Ending Titles
GDD.TITLES = [
    { id: "TITLE_RICH", name: "재벌", check: (p) => p.stats.base.wealth >= 95 },
    { id: "TITLE_HAPPY", name: "행복한 삶", check: (p) => p.stats.base.happiness >= 95 },
    { id: "TITLE_IRON", name: "철인", check: (p) => p.stats.base.health >= 100 },
    { id: "TITLE_HERO", name: "위대한 인물", check: (p) => p.stats.hidden.reputation >= 90 },
    { id: "TITLE_INFAMOUS", name: "악명 높은 자", check: (p) => p.stats.hidden.fame >= 70 && p.stats.hidden.morality <= -50 },
    { id: "TITLE_CLEAN", name: "청렴한 시민", check: (p) => p.crimeCount === 0 && p.stats.hidden.karma >= 0 },
    { id: "TITLE_FREE", name: "영원한 자유인", check: (p) => !p.family.married },
    { id: "TITLE_LOVER", name: "플레이보이/플레이걸", check: (p) => p.romanceCount >= 20 }
];

// GDD Ch.9.4
GDD.ENDING_RANKS = [
    { min: 95, rank: "SSS" },
    { min: 90, rank: "SS" },
    { min: 80, rank: "S" },
    { min: 70, rank: "A" },
    { min: 60, rank: "B" },
    { min: 40, rank: "C" },
    { min: 20, rank: "D" },
    { min: 0, rank: "E" }
];

// GDD Ch.9.3 Overall Life Score weights
GDD.LIFE_SCORE_WEIGHTS = {
    wealth: 0.15, career: 0.15, family: 0.15, relationship: 0.10,
    health: 0.10, happiness: 0.20, fame: 0.05, contribution: 0.10
};
