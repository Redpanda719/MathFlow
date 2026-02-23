import type { LobbyState, MultiplayerConfig, PlayerState, Question } from './types.js';

export type ClientToHostMessage =
  | { type: 'join'; name: string; color: string }
  | { type: 'ready'; ready: boolean }
  | { type: 'answer'; questionId: string; value: number; responseMs: number; submittedAt: number }
  | { type: 'chat'; text: string }
  | { type: 'ping'; at: number }
  | { type: 'rejoin'; playerId: string };

export type HostToClientMessage =
  | { type: 'welcome'; playerId: string; roomCode: string; lobby: LobbyState }
  | { type: 'lobby'; lobby: LobbyState }
  | { type: 'countdown'; startsAt: number }
  | { type: 'question'; question: Question; index: number; total: number; startedAt: number }
  | {
      type: 'score';
      players: PlayerState[];
      latest?: { playerId: string; delta: number; correct: boolean };
    }
  | { type: 'result'; winnerId?: string; players: PlayerState[] }
  | { type: 'chat'; playerId: string; text: string; at: number }
  | { type: 'error'; message: string }
  | { type: 'pong'; at: number };

export interface DiscoveryPacket {
  roomCode: string;
  hostName: string;
  hostIp: string;
  wsPort: number;
  mode: 'duel' | 'party' | 'nitro' | 'serpents';
  maxPlayers: number;
}

export interface HostConfig {
  hostName: string;
  roomCode: string;
  mode: 'duel' | 'party' | 'nitro' | 'serpents';
  wsPort: number;
  discoveryPort: number;
  maxPlayers: number;
  config: MultiplayerConfig;
}
