import { useEffect, useRef, useState } from 'react';

interface AudioControls {
  enabled: boolean;
  enable: () => void;
  playClick: () => void;
  playCorrect: () => void;
  playWrong: () => void;
  playCountdown: () => void;
  playVictory: () => void;
  startNitroLoop: () => void;
  stopNitroLoop: () => void;
  setNitroIntensity: (value: number) => void;
  playGameAccent: (gameId: string, success: boolean) => void;
  setVolumes: (music: number, sfx: number, muteMusic: boolean, muteSfx: boolean) => void;
}

export const useAudio = (): AudioControls => {
  const [enabled, setEnabled] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const sfxGainRef = useRef<GainNode | null>(null);
  const loopRef = useRef<number | null>(null);
  const nitroOscRef = useRef<OscillatorNode | null>(null);
  const nitroGainRef = useRef<GainNode | null>(null);
  const nitroFilterRef = useRef<BiquadFilterNode | null>(null);
  const crowdOscRef = useRef<OscillatorNode | null>(null);
  const crowdGainRef = useRef<GainNode | null>(null);

  const volumeStateRef = useRef({ music: 0.25, sfx: 0.8, muteMusic: false, muteSfx: false });

  const applyVolumes = () => {
    const state = volumeStateRef.current;
    if (musicGainRef.current) musicGainRef.current.gain.value = state.muteMusic ? 0 : state.music;
    if (sfxGainRef.current) sfxGainRef.current.gain.value = state.muteSfx ? 0 : state.sfx;
  };

  const initAudioGraph = () => {
    if (audioContextRef.current && musicGainRef.current && sfxGainRef.current) return;
    const context = new AudioContext();
    const musicGain = context.createGain();
    const sfxGain = context.createGain();
    musicGain.connect(context.destination);
    sfxGain.connect(context.destination);
    audioContextRef.current = context;
    musicGainRef.current = musicGain;
    sfxGainRef.current = sfxGain;
    applyVolumes();
  };

  const resumeContext = async (): Promise<boolean> => {
    initAudioGraph();
    const context = audioContextRef.current;
    if (!context) return false;
    try {
      if (context.state === 'suspended') await context.resume();
      return context.state === 'running';
    } catch {
      return false;
    }
  };

  const safeStop = (osc: OscillatorNode | null) => {
    if (!osc) return;
    try {
      osc.stop();
    } catch {
      // Ignore invalid state for already stopped oscillators.
    }
  };

  const beep = (frequency: number, duration: number, type: OscillatorType, gain = 0.2) => {
    const context = audioContextRef.current;
    const node = sfxGainRef.current;
    if (!context || !node || context.state !== 'running') return;
    const osc = context.createOscillator();
    const g = context.createGain();
    osc.frequency.value = frequency;
    osc.type = type;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(node);
    osc.start();
    g.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    osc.stop(context.currentTime + duration);
  };

  const playWithResume = (play: () => void) => {
    const context = audioContextRef.current;
    if (context?.state === 'running') {
      play();
      return;
    }
    resumeContext().then((ok) => {
      if (ok) play();
    });
  };

  const startMusic = () => {
    const context = audioContextRef.current;
    const musicGain = musicGainRef.current;
    if (!context || !musicGain || context.state !== 'running') return;
    if (loopRef.current) window.clearInterval(loopRef.current);
    const progression = [220, 277.18, 329.63, 392];
    let i = 0;
    loopRef.current = window.setInterval(() => {
      if (!audioContextRef.current || audioContextRef.current.state !== 'running') return;
      const osc = audioContextRef.current.createOscillator();
      const gain = audioContextRef.current.createGain();
      osc.type = 'triangle';
      osc.frequency.value = progression[i % progression.length];
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(musicGain);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContextRef.current.currentTime + 0.45);
      osc.stop(audioContextRef.current.currentTime + 0.45);
      i += 1;
    }, 500);
  };

  const enable = () => {
    resumeContext().then((ok) => {
      if (!ok) return;
      setEnabled(true);
      startMusic();
    });
  };

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && enabled) {
        resumeContext().then((ok) => {
          if (ok && !loopRef.current) startMusic();
        });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [enabled]);

  useEffect(
    () => () => {
      if (loopRef.current) window.clearInterval(loopRef.current);
      safeStop(nitroOscRef.current);
      safeStop(crowdOscRef.current);
      audioContextRef.current?.close();
    },
    []
  );

  return {
    enabled,
    enable,
    playClick: () => playWithResume(() => beep(440, 0.08, 'square', 0.08)),
    playCorrect: () => {
      playWithResume(() => beep(660, 0.09, 'sine', 0.25));
      setTimeout(() => playWithResume(() => beep(880, 0.11, 'sine', 0.2)), 60);
    },
    playWrong: () => playWithResume(() => beep(140, 0.2, 'sawtooth', 0.2)),
    playCountdown: () => playWithResume(() => beep(520, 0.08, 'triangle', 0.16)),
    playVictory: () => {
      playWithResume(() => beep(523.25, 0.1, 'triangle', 0.18));
      setTimeout(() => playWithResume(() => beep(659.25, 0.1, 'triangle', 0.18)), 100);
      setTimeout(() => playWithResume(() => beep(783.99, 0.18, 'triangle', 0.2)), 200);
    },
    startNitroLoop: () => {
      resumeContext().then((ok) => {
        if (!ok) return;
        const context = audioContextRef.current;
        const sfx = sfxGainRef.current;
        if (!context || !sfx || nitroOscRef.current) return;

        const nitroFilter = context.createBiquadFilter();
        nitroFilter.type = 'lowpass';
        nitroFilter.frequency.value = 520;
        nitroFilter.Q.value = 0.65;
        nitroFilter.connect(sfx);
        nitroFilterRef.current = nitroFilter;

        const engineOsc = context.createOscillator();
        const engineGain = context.createGain();
        engineOsc.type = 'triangle';
        engineOsc.frequency.value = 62;
        engineGain.gain.value = 0.006;
        engineOsc.connect(engineGain);
        engineGain.connect(nitroFilter);
        engineOsc.start();
        nitroOscRef.current = engineOsc;
        nitroGainRef.current = engineGain;

        const crowdOsc = context.createOscillator();
        const crowdGain = context.createGain();
        crowdOsc.type = 'sine';
        crowdOsc.frequency.value = 118;
        crowdGain.gain.value = 0.0025;
        crowdOsc.connect(crowdGain);
        crowdGain.connect(nitroFilter);
        crowdOsc.start();
        crowdOscRef.current = crowdOsc;
        crowdGainRef.current = crowdGain;
      });
    },
    stopNitroLoop: () => {
      safeStop(nitroOscRef.current);
      safeStop(crowdOscRef.current);
      nitroOscRef.current = null;
      crowdOscRef.current = null;
      nitroGainRef.current = null;
      crowdGainRef.current = null;
      nitroFilterRef.current = null;
    },
    setNitroIntensity: (value: number) => {
      const context = audioContextRef.current;
      const clamped = Math.max(0, Math.min(1, value));
      if (nitroOscRef.current && context) {
        nitroOscRef.current.frequency.setTargetAtTime(62 + clamped * 64, context.currentTime, 0.05);
      }
      if (nitroGainRef.current && context) {
        nitroGainRef.current.gain.setTargetAtTime(0.004 + clamped * 0.009, context.currentTime, 0.06);
      }
      if (crowdGainRef.current && context) {
        crowdGainRef.current.gain.setTargetAtTime(0.001 + clamped * 0.003, context.currentTime, 0.08);
      }
      if (nitroFilterRef.current && context) {
        nitroFilterRef.current.frequency.setTargetAtTime(460 + clamped * 420, context.currentTime, 0.07);
      }
    },
    playGameAccent: (gameId, success) => {
      playWithResume(() => {
        if (gameId === 'math-tower-defense') beep(success ? 280 : 150, 0.12, success ? 'square' : 'sawtooth', 0.16);
        if (gameId === 'math-io-serpents') beep(success ? 620 : 170, 0.1, success ? 'sine' : 'sawtooth', 0.15);
        if (gameId === 'math-nitro') beep(success ? 680 : 140, 0.1, success ? 'triangle' : 'sawtooth', 0.18);
      });
    },
    setVolumes: (music, sfx, muteMusic, muteSfx) => {
      volumeStateRef.current = { music, sfx, muteMusic, muteSfx };
      applyVolumes();
    }
  };
};
