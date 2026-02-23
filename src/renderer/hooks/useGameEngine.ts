import { useMemo, useState } from 'react';
import { generateQuestion } from '@shared/questions';
import { calculateAnswerPoints, summarizeRound } from '@shared/scoring';
import type { FactStatsMap, GameMode, Question, RoundStats, Settings } from '@shared/types';

interface AnswerRecord {
  questionId: string;
  value: number;
  responseMs: number;
  submittedAt: number;
  correct: boolean;
}

export const useGameEngine = (settings: Settings, weakFacts: FactStatsMap) => {
  const [mode, setMode] = useState<GameMode>('practice');
  const [question, setQuestion] = useState<Question | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [roundStats, setRoundStats] = useState<RoundStats | null>(null);
  const [timerLeft, setTimerLeft] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);

  const start = (nextMode: GameMode) => {
    setMode(nextMode);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setAnswers([]);
    setRoundStats(null);
    setAnswerText('');
    setTimerLeft(nextMode === 'practice' ? null : settings.difficulty.timerSeconds ?? 90);
    const q = generateQuestion({
      config: settings.difficulty,
      weakFacts,
      recentQuestionIds: recent,
      mode: settings.difficulty.adaptive ? 'adaptive' : 'mixed'
    });
    setQuestion(q);
    setStartedAt(Date.now());
  };

  const pushDigit = (digit: string) => {
    if (answerText.length >= 3) return;
    setAnswerText((x) => `${x}${digit}`);
  };

  const erase = () => setAnswerText((x) => x.slice(0, -1));
  const clear = () => setAnswerText('');

  const submit = () => {
    if (!question || answerText.length === 0) return { accepted: false, correct: false };
    const value = Number(answerText);
    const responseMs = Date.now() - startedAt;
    const correct = value === question.answer;

    const nextStreak = correct ? streak + 1 : 0;
    const delta = calculateAnswerPoints(correct, responseMs, nextStreak, settings, settings.difficulty.wrongPenalty);

    setScore((s) => s + delta);
    setStreak(nextStreak);
    setBestStreak((b) => Math.max(b, nextStreak));
    setFeedback(correct ? 'correct' : 'wrong');
    setTimeout(() => setFeedback(null), 420);

    setAnswers((prev) => [
      ...prev,
      {
        questionId: question.id,
        value,
        responseMs,
        submittedAt: Date.now(),
        correct
      }
    ]);

    const recKey = `${question.a}x${question.b}`;
    setRecent((prev) => [...prev.slice(-12), recKey]);

    setAnswerText('');
    const nextQ = generateQuestion({
      config: settings.difficulty,
      weakFacts,
      recentQuestionIds: [...recent, recKey],
      mode: settings.difficulty.adaptive ? 'adaptive' : 'mixed'
    });
    setQuestion(nextQ);
    setStartedAt(Date.now());
    return { accepted: true, correct, question, responseMs };
  };

  const finish = () => {
    const stats = summarizeRound(answers, bestStreak, score);
    setRoundStats(stats);
    return stats;
  };

  const accuracy = useMemo(() => {
    if (!answers.length) return 0;
    const correct = answers.filter((a) => a.correct).length;
    return (correct / answers.length) * 100;
  }, [answers]);

  return {
    mode,
    question,
    answerText,
    feedback,
    score,
    streak,
    bestStreak,
    answers,
    accuracy,
    timerLeft,
    roundStats,
    setTimerLeft,
    setQuestion,
    setStartedAt,
    start,
    pushDigit,
    erase,
    clear,
    submit,
    finish
  };
};
