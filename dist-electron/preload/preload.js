import { contextBridge, ipcRenderer } from 'electron';
const api = {
    startHost: (payload) => ipcRenderer.invoke('net:start-host', payload),
    stopHost: () => ipcRenderer.invoke('net:stop-host'),
    startDiscovery: () => ipcRenderer.invoke('net:start-discovery'),
    stopDiscovery: () => ipcRenderer.invoke('net:stop-discovery'),
    join: (payload) => ipcRenderer.invoke('net:join', payload),
    leave: () => ipcRenderer.invoke('net:leave'),
    setReady: (ready) => ipcRenderer.invoke('net:ready', ready),
    startGame: () => ipcRenderer.invoke('net:start-game'),
    submitAnswer: (payload) => ipcRenderer.invoke('net:submit-answer', payload),
    sendChat: (text) => ipcRenderer.invoke('net:chat', text),
    onEvent: (cb) => {
        const wrapped = (_, event) => cb(event);
        ipcRenderer.on('net:event', wrapped);
        return () => ipcRenderer.removeListener('net:event', wrapped);
    }
};
contextBridge.exposeInMainWorld('electronAPI', api);
