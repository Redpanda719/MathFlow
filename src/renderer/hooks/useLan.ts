import { useEffect, useMemo, useState } from 'react';
import type { DiscoveryPacket } from '@shared/network';
import type { LobbyState, MultiplayerConfig, PlayerState, Question } from '@shared/types';

interface LanState {
  hosts: DiscoveryPacket[];
  lobby: LobbyState | null;
  isHost: boolean;
  playerId: string;
  currentQuestion: Question | null;
  questionProgress: { index: number; total: number };
  countdownTo: number;
  error: string;
  result: { winnerId?: string; players: PlayerState[] } | null;
  latestScore?: { playerId: string; delta: number; correct: boolean };
}

const initialState: LanState = {
  hosts: [],
  lobby: null,
  isHost: false,
  playerId: '',
  currentQuestion: null,
  questionProgress: { index: 0, total: 0 },
  countdownTo: 0,
  error: '',
  result: null
};

export const useLan = () => {
  const [state, setState] = useState<LanState>(initialState);
  const api = window.electronAPI;

  useEffect(() => {
    if (!api) {
      setState((s) => ({ ...s, error: 'LAN is available in Electron desktop mode.' }));
      return () => undefined;
    }
    const unsubscribe = api.onEvent((event) => {
      if (event.type === 'hosts') setState((s) => ({ ...s, hosts: event.hosts }));
      if (event.type === 'host-started') setState((s) => ({ ...s, lobby: event.lobby, isHost: true, error: '' }));
      if (event.type === 'host-stopped') setState(initialState);
      if (event.type === 'joined') setState((s) => ({ ...s, playerId: event.playerId, lobby: event.lobby, isHost: false, error: '' }));
      if (event.type === 'lobby') setState((s) => ({ ...s, lobby: event.lobby }));
      if (event.type === 'countdown') setState((s) => ({ ...s, countdownTo: event.startsAt, result: null }));
      if (event.type === 'question') {
        setState((s) => ({
          ...s,
          currentQuestion: event.question,
          questionProgress: { index: event.index, total: event.total }
        }));
      }
      if (event.type === 'score') setState((s) => ({ ...s, lobby: s.lobby ? { ...s.lobby, players: event.players } : null, latestScore: event.latest }));
      if (event.type === 'result') setState((s) => ({ ...s, result: { winnerId: event.winnerId, players: event.players } }));
      if (event.type === 'error') setState((s) => ({ ...s, error: event.message }));
    });
    return unsubscribe;
  }, [api]);

  const actions = {
    startDiscovery: () => api?.startDiscovery(),
    stopDiscovery: () => api?.stopDiscovery(),
    hostRoom: (payload: { hostName: string; mode: 'duel' | 'party' | 'nitro' | 'serpents'; maxPlayers: number; config: MultiplayerConfig }) =>
      api?.startHost(payload),
    stopHost: () => api?.stopHost(),
    joinRoom: (payload: { hostIp: string; wsPort: number; name: string; color: string }) => api?.join(payload),
    leave: () => api?.leave(),
    setReady: (ready: boolean) => api?.setReady(ready),
    startGame: () => api?.startGame(),
    submitAnswer: (payload: { questionId: string; value: number; responseMs: number }) => api?.submitAnswer(payload),
    sendChat: (text: string) => api?.sendChat(text)
  };

  const myPlayer = useMemo(
    () => state.lobby?.players.find((p) => p.id === (state.isHost ? 'host-local' : state.playerId)) || null,
    [state.lobby, state.playerId, state.isHost]
  );

  return { state, actions, myPlayer };
};
