import { useEffect, useMemo, useState } from 'react';
import type { MultiplayerConfig, Profile } from '@shared/types';
import QRCode from 'qrcode';
import { useLan } from '@renderer/hooks/useLan';
import { DEFAULT_DIFFICULTIES } from '@shared/constants';

interface Props {
  profile: Profile;
  playClick: () => void;
  onBack: () => void;
}

export const LanScreen = ({ profile, playClick, onBack }: Props) => {
  const { state, actions, myPlayer } = useLan();
  const [manualIp, setManualIp] = useState('127.0.0.1');
  const [manualPort, setManualPort] = useState(9898);
  const [mode, setMode] = useState<'duel' | 'party' | 'nitro'>('duel');
  const [qrData, setQrData] = useState('');
  const [answer, setAnswer] = useState('');
  const [questionSeenAt, setQuestionSeenAt] = useState(0);

  const config = useMemo<MultiplayerConfig>(
    () => ({
      mode,
      timerSeconds: profile.settings.difficulty.timerSeconds ?? 90,
      questionCount: mode === 'duel' ? 20 : mode === 'party' ? 30 : 50,
      difficulty: profile.settings.difficulty.tier === 'custom' ? profile.settings.difficulty : DEFAULT_DIFFICULTIES.medium
    }),
    [mode, profile.settings.difficulty]
  );

  useEffect(() => {
    actions.startDiscovery();
    return () => {
      actions.stopDiscovery();
      actions.leave();
      actions.stopHost();
    };
  }, []);

  useEffect(() => {
    if (!state.lobby) return;
    const payload = `ws://${state.lobby.room.hostIp}:${state.lobby.room.wsPort}`;
    QRCode.toDataURL(payload).then(setQrData).catch(() => setQrData(''));
  }, [state.lobby?.room.hostIp, state.lobby?.room.wsPort]);

  useEffect(() => {
    if (state.currentQuestion) {
      setQuestionSeenAt(Date.now());
      setAnswer('');
    }
  }, [state.currentQuestion?.id]);

  const submit = () => {
    if (!state.currentQuestion || !answer) return;
    actions.submitAnswer({
      questionId: state.currentQuestion.id,
      value: Number(answer),
      responseMs: Date.now() - questionSeenAt
    });
    setAnswer('');
  };

  return (
    <div className="screen">
      <div className="topbar">
        <button className="ghost" onClick={onBack}>
          Back
        </button>
        <h2>LAN Multiplayer</h2>
      </div>

      <div className="lan-grid">
        <section className="card">
          <h3>Host Game</h3>
          <label>
            Mode
            <select value={mode} onChange={(e) => setMode(e.target.value as 'duel' | 'party' | 'nitro')}>
              <option value="duel">Duel (1v1)</option>
              <option value="party">Party (up to 8)</option>
              <option value="nitro">Math Nitro Race</option>
            </select>
          </label>
          <button
            className="primary"
            onClick={() => {
              playClick();
              actions.hostRoom({ hostName: profile.name, mode, maxPlayers: mode === 'duel' ? 2 : 8, config });
            }}
          >
            Start Host
          </button>
          <button className="ghost" onClick={() => actions.stopHost()}>
            Stop Host
          </button>
          {state.lobby && (
            <div className="room-meta">
              <p>
                Room: <strong>{state.lobby.room.roomCode}</strong>
              </p>
              <p>
                Join via: {state.lobby.room.hostIp}:{state.lobby.room.wsPort}
              </p>
              {qrData && <img src={qrData} alt="Room QR" className="qr" />}
            </div>
          )}
        </section>

        <section className="card">
          <h3>Join Game</h3>
          <div className="host-list">
            {state.hosts.map((host) => (
              <button
                key={`${host.hostIp}:${host.wsPort}`}
                onClick={() => actions.joinRoom({ hostIp: host.hostIp, wsPort: host.wsPort, name: profile.name, color: profile.avatarColor })}
              >
                {host.hostName} ({host.mode}) {host.hostIp}:{host.wsPort}
              </button>
            ))}
            {state.hosts.length === 0 && <p className="muted">No hosts discovered yet.</p>}
          </div>
          <label>
            Manual IP
            <input value={manualIp} onChange={(e) => setManualIp(e.target.value)} />
          </label>
          <label>
            Port
            <input type="number" value={manualPort} onChange={(e) => setManualPort(Number(e.target.value))} />
          </label>
          <button className="primary" onClick={() => actions.joinRoom({ hostIp: manualIp, wsPort: manualPort, name: profile.name, color: profile.avatarColor })}>
            Join Manually
          </button>
          <p className="muted">Local test: use 127.0.0.1 with a second app instance.</p>
        </section>
      </div>

      {state.lobby && (
        <section className="card lobby-panel">
          <div className="lobby-header">
            <h3>Lobby</h3>
            <button className="ghost" onClick={() => actions.setReady(!(myPlayer?.ready ?? false))}>
              {(myPlayer?.ready ?? false) ? 'Unready' : 'Ready'}
            </button>
            {state.isHost && (
              <button className="primary" onClick={() => actions.startGame()}>
                Start Match
              </button>
            )}
          </div>
          <div className="players-row">
            {state.lobby.players.map((player) => (
              <div key={player.id} className={`player-pill ${player.connected ? '' : 'disconnected'}`}>
                <span className="dot" style={{ background: player.color }} />
                {player.name}
                <small>{player.ready ? 'Ready' : 'Waiting'}</small>
                <strong>{player.score}</strong>
              </div>
            ))}
          </div>
          {state.countdownTo > Date.now() && <h2>Starting in {Math.ceil((state.countdownTo - Date.now()) / 1000)}</h2>}
          {state.currentQuestion && (
            <div className="multiplayer-question">
              <h1>
                {state.currentQuestion.a} x {state.currentQuestion.b}
              </h1>
              <p>
                Question {state.questionProgress.index}/{state.questionProgress.total}
              </p>
              <div className="inline-answer">
                <input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder="Answer"
                />
                <button className="primary" onClick={submit}>
                  Submit
                </button>
              </div>
            </div>
          )}
          {state.result && (
            <div className="result-block">
              <h3>Match Result</h3>
              <p>
                Winner: {state.result.players.find((p) => p.id === state.result.winnerId)?.name ?? 'Tie'}
              </p>
              {state.result.players
                .slice()
                .sort((a, b) => b.score - a.score)
                .map((p) => (
                  <p key={p.id}>
                    {p.name}: {p.score} pts ({p.correct} correct / {p.wrong} wrong)
                  </p>
                ))}
            </div>
          )}
          {state.error && <p className="error">{state.error}</p>}
        </section>
      )}
    </div>
  );
};
