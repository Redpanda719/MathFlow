import type { FC } from 'react';

interface Props {
  score: number;
  streak: number;
  accuracy: number;
  timerLeft: number | null;
  progress?: string;
}

export const GameHUD: FC<Props> = ({ score, streak, accuracy, timerLeft, progress }) => (
  <div className="hud card">
    <div>
      <p className="label">Score</p>
      <h3>{score}</h3>
    </div>
    <div>
      <p className="label">Streak</p>
      <h3>{streak}</h3>
    </div>
    <div>
      <p className="label">Accuracy</p>
      <h3>{accuracy.toFixed(0)}%</h3>
    </div>
    <div>
      <p className="label">Timer</p>
      <h3>{timerLeft === null ? '∞' : `${timerLeft}s`}</h3>
    </div>
    <div>
      <p className="label">Progress</p>
      <h3>{progress ?? '-'}</h3>
    </div>
  </div>
);
