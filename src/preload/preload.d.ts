import type { DiscoveryPacket } from '../shared/network';
import type { LobbyState, MultiplayerConfig } from '../shared/types';

type NetEvent =
  | { type: 'hosts'; hosts: DiscoveryPacket[] }
  | { type: 'host-started'; lobby: LobbyState; hostIp: string }
  | { type: 'host-stopped' }
  | { type: 'lobby'; lobby: LobbyState }
  | { type: 'countdown'; startsAt: number }
  | { type: 'question'; question: { id: string; a: number; b: number; answer: number }; index: number; total: number; startedAt: number }
  | { type: 'score'; players: LobbyState['players']; latest?: { playerId: string; delta: number; correct: boolean } }
  | { type: 'result'; players: LobbyState['players']; winnerId?: string }
  | { type: 'joined'; playerId: string; lobby: LobbyState }
  | { type: 'error'; message: string }
  | { type: 'chat'; playerId: string; text: string; at: number };

interface ElectronAPI {
  startHost: (payload: { hostName: string; mode: 'duel' | 'party' | 'nitro' | 'serpents'; maxPlayers: number; config: MultiplayerConfig }) => Promise<void>;
  stopHost: () => Promise<void>;
  startDiscovery: () => Promise<void>;
  stopDiscovery: () => Promise<void>;
  join: (payload: { hostIp: string; wsPort: number; name: string; color: string }) => Promise<void>;
  leave: () => Promise<void>;
  setReady: (ready: boolean) => Promise<void>;
  startGame: () => Promise<void>;
  submitAnswer: (payload: { questionId: string; value: number; responseMs: number }) => Promise<void>;
  sendChat: (text: string) => Promise<void>;
  onEvent: (cb: (event: NetEvent) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
