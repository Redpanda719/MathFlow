import { contextBridge, ipcRenderer } from 'electron';
import type { DiscoveryPacket } from '../shared/network.js';
import type { LobbyState, MultiplayerConfig } from '../shared/types.js';

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

const api = {
  startHost: (payload: { hostName: string; mode: 'duel' | 'party' | 'nitro' | 'serpents'; maxPlayers: number; config: MultiplayerConfig }) =>
    ipcRenderer.invoke('net:start-host', payload),
  stopHost: () => ipcRenderer.invoke('net:stop-host'),
  startDiscovery: () => ipcRenderer.invoke('net:start-discovery'),
  stopDiscovery: () => ipcRenderer.invoke('net:stop-discovery'),
  join: (payload: { hostIp: string; wsPort: number; name: string; color: string }) => ipcRenderer.invoke('net:join', payload),
  leave: () => ipcRenderer.invoke('net:leave'),
  setReady: (ready: boolean) => ipcRenderer.invoke('net:ready', ready),
  startGame: () => ipcRenderer.invoke('net:start-game'),
  submitAnswer: (payload: { questionId: string; value: number; responseMs: number }) =>
    ipcRenderer.invoke('net:submit-answer', payload),
  sendChat: (text: string) => ipcRenderer.invoke('net:chat', text),
  onEvent: (cb: (event: NetEvent) => void) => {
    const wrapped = (_: unknown, event: NetEvent) => cb(event);
    ipcRenderer.on('net:event', wrapped);
    return () => ipcRenderer.removeListener('net:event', wrapped);
  }
};

contextBridge.exposeInMainWorld('electronAPI', api);
