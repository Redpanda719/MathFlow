import { clamp } from './utils.js';
export const calculateAnswerPoints = (isCorrect, responseMs, streak, settings, wrongPenalty) => {
    if (!isCorrect)
        return -wrongPenalty;
    const speedBonus = Math.max(0, Math.round((3000 - responseMs) * settings.speedMultiplier));
    const streakBonus = Math.round(streak * settings.streakMultiplier);
    return settings.basePoints + speedBonus + streakBonus;
};
export const summarizeRound = (answers, bestStreak, totalScore) => {
    const correct = answers.filter((a) => a.correct).length;
    const wrong = answers.length - correct;
    const accuracy = answers.length ? clamp((correct / answers.length) * 100, 0, 100) : 0;
    const averageResponseMs = answers.length > 0 ? answers.reduce((sum, ans) => sum + ans.responseMs, 0) / answers.length : 0;
    let streak = 0;
    for (let i = answers.length - 1; i >= 0; i -= 1) {
        if (answers[i].correct)
            streak += 1;
        else
            break;
    }
    return {
        correct,
        wrong,
        accuracy,
        averageResponseMs,
        streak,
        bestStreak,
        score: totalScore
    };
};
