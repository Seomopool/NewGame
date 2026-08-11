// GDD Ch.8 Job System
class JobManager {
    getAvailableJobs(player) {
        const eduOrder = ["KINDERGARTEN", "ELEMENTARY", "MIDDLE_SCHOOL", "HIGH_SCHOOL", "UNIVERSITY", "GRADUATED"];
        const playerLevel = eduOrder.indexOf(player.education.highestCompleted);
        return GDD.JOBS.filter(j => eduOrder.indexOf(j.requiredEducation) <= playerLevel);
    }

    // Employment Score = Education + MajorMatch + Skill + Personality + Interview + Luck
    calculateEmploymentScore(player, job) {
        const educationScore = player.education.gpa * 10;
        const majorMatch = player.education.major && GDD.MAJORS.find(m => m.id === player.education.major)?.jobBoost.includes(job.id) ? 15 : 0;
        const skill = player.stats.base.intelligence * 0.3;
        const personality = player.stats.personality.responsibility * 0.2;
        const interview = player.stats.personality.confidence * 0.2;
        const luck = player.stats.hidden.luck * 0.2;
        return educationScore * 0.3 + majorMatch + skill + personality + interview + luck;
    }

    // 구직 활동: 지원 가능한 직업 중 Employment Score가 가장 높은 곳에 지원한다.
    attemptEmployment(player) {
        const candidates = this.getAvailableJobs(player);
        if (!candidates.length) return null;
        const scored = candidates
            .map(job => ({ job, score: this.calculateEmploymentScore(player, job) }))
            .sort((a, b) => b.score - a.score);
        const best = scored[0];
        if (best.score >= 50) {
            this.applyEmployment(player, best.job.id);
            return { success: true, job: best.job };
        }
        return { success: false, job: best.job };
    }

    applyEmployment(player, jobId) {
        const job = GDD.JOBS.find(j => j.id === jobId);
        if (!job) return false;
        player.job = { id: job.id, name: job.name, category: job.category, baseSalary: job.baseSalary, level: 1, years: 0, performance: 60, salary: job.baseSalary };
        player.careerHistory.push({ job: job.name, startAge: player.age });
        return true;
    }

    // Salary = BaseSalary * CompanyLevel * CareerMultiplier
    calculateSalary(job) {
        const careerMultiplier = 1 + job.years * 0.11;
        return Math.round(job.baseSalary * (1 + (job.level - 1) * 0.2) * careerMultiplier);
    }

    yearlyProgress(player) {
        const job = player.job;
        if (!job) return;
        job.years += 1;

        // Promotion = Performance + Responsibility + Leadership(신뢰) + Relationship - Stress
        const promotionScore = job.performance + player.stats.personality.responsibility +
            player.stats.hidden.reputation * 0.3 + player.stats.derived.relationship * 0.2 - player.stats.base.stress * 0.3;
        if (job.level < 10 && promotionScore > 120 && Math.random() * 100 < 25) {
            job.level += 1;
            player.log.push(`[승진] ${job.name}(Lv.${job.level})으로 승진했습니다.`);
        }

        // Dismissal = LowPerformance + Conflict + CompanyCrisis (공무원 계열 낮은 확률)
        const dismissalChance = job.category === "Public" ? 1 : Math.max(0, (60 - job.performance) * 0.3 + player.stats.base.stress * 0.1);
        if (Math.random() * 100 < dismissalChance) {
            this.processDismissal(player);
            return;
        }

        job.salary = this.calculateSalary(job);
        player.stats.increase("base", "wealth", Math.round(job.salary / 5000));

        // Burnout = Stress + Workload - Mental
        const burnoutRisk = player.stats.base.stress + job.performance * 0.2 - player.stats.base.mental;
        if (burnoutRisk > 90) {
            player.stats.decrease("base", "happiness", 10);
            player.stats.decrease("base", "health", 5);
            job.performance = Math.max(10, job.performance - 10);
            player.log.push(`[번아웃] 과도한 업무로 번아웃이 왔습니다.`);
        }
    }

    processDismissal(player) {
        player.log.push(`[실직] ${player.job.name} 자리에서 물러났습니다.`);
        player.job = null;
    }

    processRetirement(player) {
        if (player.job) {
            player.careerHistory[player.careerHistory.length - 1].endAge = player.age;
        }
        player.job = null;
        player.retired = true;
    }
}
