import { app, BrowserWindow, ipcMain, nativeImage } from 'electron';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dgram from 'node:dgram';
import { WebSocket, WebSocketServer } from 'ws';
import { generateQuestion } from '../shared/questions.js';
import { DEFAULT_SETTINGS } from '../shared/constants.js';
import { calculateAnswerPoints } from '../shared/scoring.js';
import { createSeededRng, factKey } from '../shared/utils.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = !app.isPackaged;
const DISCOVERY_INTERVAL_MS = 1200;
const resolveAppIconPath = () => {
    if (isDev) {
        return path.join(__dirname, '../../public/assets/branding/app-icon.png');
    }
    return path.join(__dirname, '../../dist/assets/branding/app-icon.png');
};
let mainWindow = null;
let discoverySocket = null;
let discoveryPoller = null;
const discoveredHosts = new Map();
let hostRuntime = null;
const clientRuntime = {};
const sendEvent = (event) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('net:event', event);
    }
};
const getLocalIp = () => {
    const nets = networkInterfaces();
    for (const iface of Object.values(nets)) {
        for (const addr of iface || []) {
            if (addr.family === 'IPv4' && !addr.internal)
                return addr.address;
        }
    }
    return '127.0.0.1';
};
const randomRoomCode = () => Math.random().toString(36).slice(2, 7).toUpperCase();
const safeSendWs = (ws, payload) => {
    if (ws.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify(payload));
};
const broadcastLobby = () => {
    if (!hostRuntime)
        return;
    const lobbyMessage = { type: 'lobby', lobby: hostRuntime.lobby };
    for (const ws of hostRuntime.clients.values())
        safeSendWs(ws, lobbyMessage);
    sendEvent({ type: 'lobby', lobby: hostRuntime.lobby });
};
const stopHost = () => {
    if (!hostRuntime)
        return;
    if (hostRuntime.ticker)
        clearInterval(hostRuntime.ticker);
    if (hostRuntime.announceTicker)
        clearInterval(hostRuntime.announceTicker);
    hostRuntime.wsServer.clients.forEach((ws) => ws.close());
    hostRuntime.wsServer.close();
    hostRuntime.server.close();
    hostRuntime = null;
    sendEvent({ type: 'host-stopped' });
};
const stopClient = () => {
    if (clientRuntime.ws && clientRuntime.ws.readyState === WebSocket.OPEN) {
        clientRuntime.ws.close();
    }
    clientRuntime.ws = undefined;
    clientRuntime.playerId = undefined;
};
const startGameIfReady = () => {
    if (!hostRuntime)
        return;
    const readyPlayers = hostRuntime.lobby.players.filter((p) => p.ready && p.connected);
    if (readyPlayers.length < 1) {
        sendEvent({ type: 'error', message: 'At least one ready player is required.' });
        return;
    }
    hostRuntime.lobby.started = true;
    hostRuntime.questionIndex = 0;
    const total = hostRuntime.config.config.questionCount;
    hostRuntime.gameEndsAt = Date.now() + hostRuntime.config.config.timerSeconds * 1000;
    const seed = hostRuntime.config.config.seed ?? Math.floor(Math.random() * 1_000_000_000);
    const seededRng = createSeededRng(seed);
    hostRuntime.questionQueue = Array.from({ length: total }).map(() => generateQuestion({
        config: hostRuntime.config.config.difficulty,
        weakFacts: hostRuntime.weakFacts,
        recentQuestionIds: [],
        mode: hostRuntime.config.config.difficulty.adaptive ? 'adaptive' : 'mixed',
        rng: seededRng
    }));
    const startsAt = Date.now() + 3200;
    const countdownMessage = { type: 'countdown', startsAt };
    for (const ws of hostRuntime.clients.values())
        safeSendWs(ws, countdownMessage);
    sendEvent({ type: 'countdown', startsAt });
    const nextQuestion = () => {
        if (!hostRuntime)
            return;
        const now = Date.now();
        if (now >= hostRuntime.gameEndsAt || hostRuntime.questionIndex >= total) {
            const winner = [...hostRuntime.lobby.players].sort((a, b) => b.score - a.score)[0];
            const result = { type: 'result', winnerId: winner?.id, players: hostRuntime.lobby.players };
            for (const ws of hostRuntime.clients.values())
                safeSendWs(ws, result);
            sendEvent({ type: 'result', winnerId: winner?.id, players: hostRuntime.lobby.players });
            hostRuntime.lobby.started = false;
            if (hostRuntime.ticker)
                clearInterval(hostRuntime.ticker);
            broadcastLobby();
            return;
        }
        const q = hostRuntime.questionQueue[hostRuntime.questionIndex] ??
            generateQuestion({
                config: hostRuntime.config.config.difficulty,
                weakFacts: hostRuntime.weakFacts,
                recentQuestionIds: hostRuntime.currentQuestion ? [factKey(hostRuntime.currentQuestion.a, hostRuntime.currentQuestion.b)] : [],
                mode: hostRuntime.config.config.difficulty.adaptive ? 'adaptive' : 'mixed'
            });
        hostRuntime.currentQuestion = q;
        hostRuntime.questionStartedAt = now;
        hostRuntime.questionIndex += 1;
        const msg = {
            type: 'question',
            question: q,
            index: hostRuntime.questionIndex,
            total,
            startedAt: now
        };
        for (const ws of hostRuntime.clients.values())
            safeSendWs(ws, msg);
        sendEvent({ type: 'question', question: q, index: hostRuntime.questionIndex, total, startedAt: now });
    };
    setTimeout(() => {
        nextQuestion();
        const cadence = (hostRuntime?.config.config.difficulty.perQuestionSeconds ?? 7) * 1000;
        hostRuntime.ticker = setInterval(nextQuestion, cadence);
    }, startsAt - Date.now());
};
const applyAnswer = (playerId, payload) => {
    if (!hostRuntime || !hostRuntime.currentQuestion || !hostRuntime.lobby.started)
        return;
    const question = hostRuntime.currentQuestion;
    if (payload.questionId !== question.id)
        return;
    const player = hostRuntime.lobby.players.find((p) => p.id === playerId);
    if (!player)
        return;
    const correct = payload.value === question.answer;
    if (correct) {
        player.correct += 1;
        player.streak += 1;
        player.bestStreak = Math.max(player.bestStreak, player.streak);
    }
    else {
        player.wrong += 1;
        player.streak = 0;
    }
    const attempts = player.correct + player.wrong;
    player.avgMs = attempts > 0 ? (player.avgMs * (attempts - 1) + payload.responseMs) / attempts : payload.responseMs;
    const delta = calculateAnswerPoints(correct, payload.responseMs, player.streak, { ...DEFAULT_SETTINGS, basePoints: 50 }, hostRuntime.config.config.difficulty.wrongPenalty);
    player.score += delta;
    const fKey = factKey(question.a, question.b);
    const current = hostRuntime.weakFacts[fKey] ?? { attempts: 0, correct: 0, averageMs: 0, lastSeen: 0 };
    const newAttempts = current.attempts + 1;
    hostRuntime.weakFacts[fKey] = {
        attempts: newAttempts,
        correct: current.correct + (correct ? 1 : 0),
        averageMs: (current.averageMs * current.attempts + payload.responseMs) / newAttempts,
        lastSeen: Date.now()
    };
    const scoreMsg = {
        type: 'score',
        players: hostRuntime.lobby.players,
        latest: { playerId, delta, correct }
    };
    for (const ws of hostRuntime.clients.values())
        safeSendWs(ws, scoreMsg);
    sendEvent({ type: 'score', players: hostRuntime.lobby.players, latest: { playerId, delta, correct } });
};
const startHost = async (roomPartial) => {
    stopHost();
    const wsPort = roomPartial.wsPort ?? 9898;
    const discoveryPort = roomPartial.discoveryPort ?? 41234;
    const roomCode = randomRoomCode();
    const hostIp = getLocalIp();
    const roomConfig = {
        hostName: roomPartial.hostName,
        mode: roomPartial.mode,
        maxPlayers: roomPartial.maxPlayers,
        config: roomPartial.config,
        roomCode,
        wsPort,
        discoveryPort
    };
    const server = createServer();
    const wsServer = new WebSocketServer({ server });
    const hostPlayer = {
        id: 'host-local',
        name: roomPartial.hostName,
        color: '#3a8dde',
        score: 0,
        correct: 0,
        wrong: 0,
        streak: 0,
        bestStreak: 0,
        avgMs: 0,
        ready: true,
        connected: true
    };
    const lobby = {
        room: {
            roomCode,
            hostName: roomPartial.hostName,
            hostIp,
            wsPort,
            mode: roomPartial.mode,
            maxPlayers: roomPartial.maxPlayers
        },
        players: [hostPlayer],
        started: false
    };
    hostRuntime = {
        config: roomConfig,
        lobby,
        wsServer,
        server,
        clients: new Map(),
        sockets: new Map(),
        weakFacts: {},
        questionIndex: 0,
        questionStartedAt: 0,
        gameEndsAt: 0,
        questionQueue: []
    };
    wsServer.on('connection', (socket) => {
        socket.on('message', (raw) => {
            if (!hostRuntime)
                return;
            let msg;
            try {
                msg = JSON.parse(raw.toString());
            }
            catch {
                return;
            }
            if (msg.type === 'join') {
                if (hostRuntime.lobby.players.length >= hostRuntime.config.maxPlayers) {
                    safeSendWs(socket, { type: 'error', message: 'Room is full' });
                    return;
                }
                const playerId = `p-${Math.random().toString(36).slice(2, 8)}`;
                const player = {
                    id: playerId,
                    name: msg.name,
                    color: msg.color,
                    score: 0,
                    correct: 0,
                    wrong: 0,
                    streak: 0,
                    bestStreak: 0,
                    avgMs: 0,
                    ready: false,
                    connected: true
                };
                hostRuntime.lobby.players.push(player);
                hostRuntime.clients.set(playerId, socket);
                hostRuntime.sockets.set(socket, playerId);
                safeSendWs(socket, { type: 'welcome', playerId, roomCode: hostRuntime.lobby.room.roomCode, lobby: hostRuntime.lobby });
                broadcastLobby();
            }
            if (msg.type === 'rejoin') {
                const found = hostRuntime.lobby.players.find((p) => p.id === msg.playerId);
                if (found) {
                    found.connected = true;
                    hostRuntime.clients.set(found.id, socket);
                    hostRuntime.sockets.set(socket, found.id);
                    safeSendWs(socket, { type: 'welcome', playerId: found.id, roomCode: hostRuntime.lobby.room.roomCode, lobby: hostRuntime.lobby });
                    broadcastLobby();
                }
            }
            if (msg.type === 'ready') {
                const pid = hostRuntime.sockets.get(socket);
                const player = hostRuntime.lobby.players.find((p) => p.id === pid);
                if (player) {
                    player.ready = msg.ready;
                    broadcastLobby();
                }
            }
            if (msg.type === 'answer') {
                const pid = hostRuntime.sockets.get(socket);
                if (pid)
                    applyAnswer(pid, msg);
            }
            if (msg.type === 'chat') {
                const pid = hostRuntime.sockets.get(socket);
                if (!pid)
                    return;
                const event = { type: 'chat', playerId: pid, text: msg.text.slice(0, 120), at: Date.now() };
                for (const ws of hostRuntime.clients.values())
                    safeSendWs(ws, event);
                sendEvent(event);
            }
            if (msg.type === 'ping') {
                safeSendWs(socket, { type: 'pong', at: msg.at });
            }
        });
        socket.on('close', () => {
            if (!hostRuntime)
                return;
            const pid = hostRuntime.sockets.get(socket);
            if (!pid)
                return;
            hostRuntime.sockets.delete(socket);
            hostRuntime.clients.delete(pid);
            const player = hostRuntime.lobby.players.find((p) => p.id === pid);
            if (player)
                player.connected = false;
            broadcastLobby();
        });
    });
    await new Promise((resolve, reject) => {
        server.listen(wsPort, '0.0.0.0', () => resolve());
        server.once('error', reject);
    });
    const announce = () => {
        if (!hostRuntime)
            return;
        const socket = dgram.createSocket('udp4');
        socket.bind(() => {
            socket.setBroadcast(true);
            const packet = {
                roomCode,
                hostName: roomPartial.hostName,
                hostIp,
                wsPort,
                mode: roomPartial.mode,
                maxPlayers: roomPartial.maxPlayers
            };
            const message = Buffer.from(JSON.stringify(packet));
            socket.send(message, discoveryPort, '255.255.255.255', () => socket.close());
        });
    };
    announce();
    hostRuntime.announceTicker = setInterval(announce, DISCOVERY_INTERVAL_MS);
    sendEvent({ type: 'host-started', lobby, hostIp });
    sendEvent({ type: 'lobby', lobby });
    return { roomCode, hostIp };
};
const startDiscovery = (port = 41234) => {
    if (discoverySocket)
        return;
    discoveredHosts.clear();
    discoverySocket = dgram.createSocket('udp4');
    discoverySocket.on('message', (message) => {
        try {
            const packet = JSON.parse(message.toString());
            discoveredHosts.set(`${packet.hostIp}:${packet.wsPort}`, { ...packet, seenAt: Date.now() });
        }
        catch {
            // ignore malformed packets
        }
    });
    discoverySocket.bind(port, () => {
        discoverySocket?.setBroadcast(true);
    });
    discoveryPoller = setInterval(() => {
        const now = Date.now();
        for (const [key, host] of discoveredHosts) {
            if (now - host.seenAt > 4000)
                discoveredHosts.delete(key);
        }
        sendEvent({ type: 'hosts', hosts: [...discoveredHosts.values()] });
    }, 1000);
};
const stopDiscovery = () => {
    if (discoveryPoller)
        clearInterval(discoveryPoller);
    discoveryPoller = null;
    if (discoverySocket)
        discoverySocket.close();
    discoverySocket = null;
    discoveredHosts.clear();
};
const joinRoom = async (hostIp, wsPort, name, color) => {
    stopClient();
    await new Promise((resolve, reject) => {
        const ws = new WebSocket(`ws://${hostIp}:${wsPort}`);
        clientRuntime.ws = ws;
        ws.on('open', () => {
            ws.send(JSON.stringify({ type: 'join', name, color }));
            resolve();
        });
        ws.on('message', (raw) => {
            let msg;
            try {
                msg = JSON.parse(raw.toString());
            }
            catch {
                return;
            }
            if (msg.type === 'welcome') {
                clientRuntime.playerId = msg.playerId;
                sendEvent({ type: 'joined', playerId: msg.playerId, lobby: msg.lobby });
            }
            if (msg.type === 'lobby')
                sendEvent({ type: 'lobby', lobby: msg.lobby });
            if (msg.type === 'countdown')
                sendEvent(msg);
            if (msg.type === 'question')
                sendEvent(msg);
            if (msg.type === 'score')
                sendEvent(msg);
            if (msg.type === 'result')
                sendEvent(msg);
            if (msg.type === 'chat')
                sendEvent(msg);
            if (msg.type === 'error')
                sendEvent(msg);
        });
        ws.on('close', () => {
            sendEvent({ type: 'error', message: 'Disconnected from host.' });
        });
        ws.on('error', () => reject(new Error('Unable to connect to host')));
    });
};
const createWindow = () => {
    const iconPath = resolveAppIconPath();
    mainWindow = new BrowserWindow({
        width: 1260,
        height: 840,
        minWidth: 1000,
        minHeight: 700,
        show: false,
        frame: true,
        movable: true,
        titleBarStyle: 'default',
        backgroundColor: '#0f1726',
        icon: iconPath,
        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    mainWindow.once('ready-to-show', () => mainWindow?.show());
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
    }
};
app.whenReady().then(() => {
    const iconPath = resolveAppIconPath();
    if (process.platform === 'darwin' && app.dock) {
        const dockIcon = nativeImage.createFromPath(iconPath);
        if (!dockIcon.isEmpty())
            app.dock.setIcon(dockIcon);
    }
    createWindow();
    ipcMain.handle('net:start-host', async (_, payload) => startHost(payload));
    ipcMain.handle('net:stop-host', () => stopHost());
    ipcMain.handle('net:start-discovery', (_, port) => startDiscovery(port));
    ipcMain.handle('net:stop-discovery', () => stopDiscovery());
    ipcMain.handle('net:join', async (_, payload) => joinRoom(payload.hostIp, payload.wsPort, payload.name, payload.color));
    ipcMain.handle('net:leave', () => stopClient());
    ipcMain.handle('net:ready', (_, ready) => {
        if (clientRuntime.ws && clientRuntime.ws.readyState === WebSocket.OPEN) {
            clientRuntime.ws.send(JSON.stringify({ type: 'ready', ready }));
        }
        if (hostRuntime) {
            const hostPlayer = hostRuntime.lobby.players.find((p) => p.id === 'host-local');
            if (hostPlayer)
                hostPlayer.ready = ready;
            broadcastLobby();
        }
    });
    ipcMain.handle('net:start-game', () => startGameIfReady());
    ipcMain.handle('net:submit-answer', (_, payload) => {
        if (clientRuntime.ws && clientRuntime.ws.readyState === WebSocket.OPEN) {
            clientRuntime.ws.send(JSON.stringify({ type: 'answer', ...payload, submittedAt: Date.now() }));
        }
        if (hostRuntime) {
            applyAnswer('host-local', payload);
        }
    });
    ipcMain.handle('net:chat', (_, text) => {
        if (clientRuntime.ws && clientRuntime.ws.readyState === WebSocket.OPEN) {
            clientRuntime.ws.send(JSON.stringify({ type: 'chat', text }));
        }
    });
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
app.on('before-quit', () => {
    stopHost();
    stopDiscovery();
    stopClient();
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        app.quit();
});
