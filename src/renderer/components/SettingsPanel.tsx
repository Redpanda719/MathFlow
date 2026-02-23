import type { FC } from 'react';
import { DEFAULT_DIFFICULTIES, FACT_RANGE } from '@shared/constants';
import type { Profile } from '@shared/types';

interface Props {
  profile: Profile;
  onUpdateProfile: (p: Partial<Pick<Profile, 'name' | 'avatarColor'>>) => void;
  onUpdateSettings: (settings: Partial<Profile['settings']>) => void;
  onSetDifficulty: (difficulty: Profile['settings']['difficulty']) => void;
}

export const SettingsPanel: FC<Props> = ({ profile, onUpdateProfile, onUpdateSettings, onSetDifficulty }) => {
  const selectedTables = [...new Set(profile.settings.difficulty.tables)].filter((n) => n >= 1 && n <= 12).sort((a, b) => a - b);
  const rangeMin = selectedTables[0] ?? 1;
  const rangeMax = selectedTables[selectedTables.length - 1] ?? 9;
  const applyRange = (min: number, max: number) => {
    const start = Math.min(min, max);
    const end = Math.max(min, max);
    const tables = FACT_RANGE.filter((n) => n >= start && n <= end);
    onSetDifficulty({ ...profile.settings.difficulty, tier: 'custom', tables });
  };

  return (
    <div className="settings-grid">
    <section className="card">
      <h3>Profile</h3>
      <label>
        Name
        <input value={profile.name} onChange={(e) => onUpdateProfile({ name: e.target.value.slice(0, 16) })} />
      </label>
      <label>
        Avatar Color
        <input type="color" value={profile.avatarColor} onChange={(e) => onUpdateProfile({ avatarColor: e.target.value })} />
      </label>
    </section>

    <section className="card">
      <h3>Difficulty</h3>
      <div className="difficulty-buttons">
        <button onClick={() => onSetDifficulty(DEFAULT_DIFFICULTIES.easy)}>Easy</button>
        <button onClick={() => onSetDifficulty(DEFAULT_DIFFICULTIES.medium)}>Medium</button>
        <button onClick={() => onSetDifficulty(DEFAULT_DIFFICULTIES.hard)}>Hard</button>
      </div>
      <label>
        Table Range Start
        <select value={rangeMin} onChange={(e) => applyRange(Number(e.target.value), rangeMax)}>
          {FACT_RANGE.map((n) => (
            <option key={`range-min-${n}`} value={n}>{n}</option>
          ))}
        </select>
      </label>
      <label>
        Table Range End
        <select value={rangeMax} onChange={(e) => applyRange(rangeMin, Number(e.target.value))}>
          {FACT_RANGE.map((n) => (
            <option key={`range-max-${n}`} value={n}>{n}</option>
          ))}
        </select>
      </label>
      <label>
        Round Timer
        <select
          value={profile.settings.difficulty.timerSeconds ?? 90}
          onChange={(e) => onSetDifficulty({ ...profile.settings.difficulty, timerSeconds: Number(e.target.value), tier: 'custom' })}
        >
          <option value={60}>60s</option>
          <option value={90}>90s</option>
          <option value={120}>120s</option>
        </select>
      </label>
      <label>
        Wrong Penalty
        <input
          type="range"
          min={0}
          max={15}
          value={profile.settings.difficulty.wrongPenalty}
          onChange={(e) => onSetDifficulty({ ...profile.settings.difficulty, wrongPenalty: Number(e.target.value), tier: 'custom' })}
        />
      </label>
    </section>

    <section className="card">
      <h3>Audio + Accessibility</h3>
      <label>
        Music Volume
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={profile.settings.musicVolume}
          onChange={(e) => onUpdateSettings({ musicVolume: Number(e.target.value) })}
        />
      </label>
      <label>
        SFX Volume
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={profile.settings.sfxVolume}
          onChange={(e) => onUpdateSettings({ sfxVolume: Number(e.target.value) })}
        />
      </label>
      <div className="toggle-row">
        <label>
          <input
            type="checkbox"
            checked={profile.settings.muteMusic}
            onChange={(e) => onUpdateSettings({ muteMusic: e.target.checked })}
          />
          Mute Music
        </label>
        <label>
          <input type="checkbox" checked={profile.settings.muteSfx} onChange={(e) => onUpdateSettings({ muteSfx: e.target.checked })} />
          Mute SFX
        </label>
        <label>
          <input
            type="checkbox"
            checked={profile.settings.highContrast}
            onChange={(e) => onUpdateSettings({ highContrast: e.target.checked })}
          />
          High Contrast
        </label>
        <label>
          <input
            type="checkbox"
            checked={profile.settings.reducedMotion}
            onChange={(e) => onUpdateSettings({ reducedMotion: e.target.checked })}
          />
          Reduced Motion
        </label>
      </div>
    </section>
    </div>
  );
};
