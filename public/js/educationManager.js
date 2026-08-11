// GDD Ch.7 Education System
class EducationManager {
    getStage(age) {
        return GDD.EDUCATION_STAGES.find(s => age >= s.minAge && age <= s.maxAge) || GDD.EDUCATION_STAGES[GDD.EDUCATION_STAGES.length - 1];
    }

    // ExamScore = INT*0.45 + Study(성실성)*0.35 + Responsibility*0.20 - Stress*0.15 + Random(-10~10)
    calculateExamScore(stats) {
        const raw = stats.base.intelligence * 0.45 + stats.personality.patience * 0.35 +
            stats.personality.responsibility * 0.20 - stats.base.stress * 0.15 + (Math.random() * 20 - 10);
        return Math.max(0, Math.min(100, Math.round(raw)));
    }

    // Dropout Risk = Stress - Responsibility + Depression(=100-mental 근사)
    calculateDropoutRisk(stats) {
        const depression = 100 - stats.base.mental;
        return stats.base.stress - stats.personality.responsibility + depression;
    }

    // Acceptance = Academic + Interview(성격) + Extracurricular(평판) + Luck
    calculateUniversityAcceptance(player) {
        const academic = player.education.gpa * 20; // 4.5 만점 -> 90 환산
        const interview = player.stats.personality.confidence * 0.3;
        const extracurricular = player.stats.hidden.reputation * 0.3;
        const luck = player.stats.hidden.luck * 0.2;
        return Math.max(5, Math.min(95, academic * 0.5 + interview + extracurricular + luck));
    }

    processSemester(player) {
        const score = this.calculateExamScore(player.stats);
        player.education.gpa = Math.round(((player.education.gpa * 3 + score / 100 * 4.5) / 4) * 100) / 100;
        return score;
    }

    assignMajor(player, majorId) {
        player.education.major = majorId;
    }
}
