"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const api = {
    startHost: (payload) => electron_1.ipcRenderer.invoke('net:start-host', payload),
    stopHost: () => electron_1.ipcRenderer.invoke('net:stop-host'),
    startDiscovery: () => electron_1.ipcRenderer.invoke('net:start-discovery'),
    stopDiscovery: () => electron_1.ipcRenderer.invoke('net:stop-discovery'),
    join: (payload) => electron_1.ipcRenderer.invoke('net:join', payload),
    leave: () => electron_1.ipcRenderer.invoke('net:leave'),
    setReady: (ready) => electron_1.ipcRenderer.invoke('net:ready', ready),
    startGame: () => electron_1.ipcRenderer.invoke('net:start-game'),
    submitAnswer: (payload) => electron_1.ipcRenderer.invoke('net:submit-answer', payload),
    sendChat: (text) => electron_1.ipcRenderer.invoke('net:chat', text),
    onEvent: (cb) => {
        const wrapped = (_, event) => cb(event);
        electron_1.ipcRenderer.on('net:event', wrapped);
        return () => electron_1.ipcRenderer.removeListener('net:event', wrapped);
    }
};
electron_1.contextBridge.exposeInMainWorld('electronAPI', api);
